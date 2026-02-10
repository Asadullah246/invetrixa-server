import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PosQueueService } from '../queue';
import {
  Prisma,
  SaleStatus,
  StockReferenceType,
  PaymentStatus,
} from 'generated/prisma/client';
import {
  CreateRefundDto,
  RefundResponseDto,
} from '../dto/refund/create-refund.dto';
import { MovementService, BulkStockInItemDto } from '@/modules/stock';

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movementService: MovementService,
    private readonly queueService: PosQueueService,
  ) {}

  /**
   * Generate refund number (REF-YYYY-NNNNN)
   */
  private async generateRefundNumber(
    tenantId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REF-${year}-`;

    const latest = await tx.saleRefund.findFirst({
      where: {
        tenantId,
        refundNumber: { startsWith: prefix },
      },
      orderBy: { refundNumber: 'desc' },
      select: { refundNumber: true },
    });

    let nextNumber = 1;
    if (latest) {
      const numPart = latest.refundNumber.replace(prefix, '');
      nextNumber = parseInt(numPart, 10) + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  /**
   * Process a refund for a sale.
   */
  async createRefund(
    tenantId: string,
    userId: string,
    saleId: string,
    dto: CreateRefundDto,
  ): Promise<{ message: string; data: RefundResponseDto }> {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    if (
      sale.status !== SaleStatus.COMPLETED &&
      sale.status !== SaleStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        `Cannot refund sale with status ${sale.status}`,
      );
    }

    // Basic validation of refund amount vs remaining
    const refundedSoFar = await this.prisma.saleRefund.aggregate({
      where: { saleId: sale.id },
      _sum: { amount: true },
    });
    const totalRefunded = refundedSoFar._sum.amount
      ? refundedSoFar._sum.amount
      : new Prisma.Decimal(0);
    const maxRefundable = sale.paidAmount
      .sub(totalRefunded)
      .sub(sale.changeAmount); // Don't refund change given back

    if (new Prisma.Decimal(dto.amount).gt(maxRefundable)) {
      throw new BadRequestException(
        `Refund amount exceeds maximum refundable amount: ${maxRefundable.toFixed(2)}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const refundNumber = await this.generateRefundNumber(tenantId, tx);

      // 1. Create Refund Record
      const refund = await tx.saleRefund.create({
        data: {
          refundNumber,
          amount: new Prisma.Decimal(dto.amount),
          method: dto.method,
          status: PaymentStatus.COMPLETED,
          reason: dto.reason,
          saleId: sale.id,
          processedById: userId,
          tenantId,
          items: dto.items
            ? (dto.items as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull, // Store item details if provided
        },
      });

      // 2. Handle Stock Return (if items specified)
      if (dto.items && dto.items.length > 0) {
        const stockInItems: BulkStockInItemDto[] = [];
        for (const refundItem of dto.items) {
          const saleItem = sale.items.find(
            (i) => i.id === refundItem.saleItemId,
          );
          if (!saleItem) {
            throw new BadRequestException(
              `Sale item ${refundItem.saleItemId} not found in this sale`,
            );
          }
          stockInItems.push({
            productId: saleItem.productId,
            quantity: refundItem.quantity,
            unitCost: Number(saleItem.unitCost), // Use original cost
          });
        }

        await this.movementService.stockIn(
          tenantId,
          userId,
          {
            locationId: sale.locationId,
            items: stockInItems,
            referenceType: StockReferenceType.RETURN,
            referenceId: refund.id,
            note: `Refund: ${dto.reason}`,
          },
          tx,
        );
      }

      // 3. Update Sale Status
      // Determine if fully refunded
      // Re-calculate total refunded including this one
      const newTotalRefunded = totalRefunded.add(
        new Prisma.Decimal(dto.amount),
      );
      // Approx check for status update
      const newStatus = newTotalRefunded.gte(
        sale.paidAmount.sub(sale.changeAmount),
      )
        ? SaleStatus.REFUNDED
        : SaleStatus.PARTIALLY_REFUNDED;

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: newStatus },
      });

      return refund;
    });

    // Background: Update Daily Sales Summary
    await this.queueService.dispatchUpdateDailySales(
      tenantId,
      sale.locationId,
      result.processedAt,
    );

    return {
      message: 'Refund processed successfully',
      data: {
        id: result.id,
        refundNumber: result.refundNumber,
        amount: result.amount.toFixed(4),
        method: result.method,
        status: result.status,
        reason: result.reason,
        saleId: result.saleId,
        processedAt: result.processedAt,
        processedByName: 'Current User', // TODO: Get name properly
      },
    };
  }
}
