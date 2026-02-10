import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma, PaymentStatus } from 'generated/prisma/client';
import { PaymentDto } from '../dto/payment/payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process payments for a sale.
   * Creates SalePayment records within a transaction.
   */
  async processPayments(
    tx: Prisma.TransactionClient,
    saleId: string,
    payments: PaymentDto[],
    processedById: string,
  ): Promise<Prisma.Decimal> {
    if (!payments.length) {
      return new Prisma.Decimal(0);
    }

    let totalPaid = new Prisma.Decimal(0);

    for (const payment of payments) {
      const amount = new Prisma.Decimal(payment.amount);
      totalPaid = totalPaid.add(amount);

      await tx.salePayment.create({
        data: {
          saleId,
          amount,
          method: payment.method,
          status: PaymentStatus.COMPLETED, // Assuming immediate completion for POS
          transactionRef: payment.transactionRef,
          notes: payment.notes,
          processedById,
        },
      });
    }

    return totalPaid;
  }

  /**
   * Calculate change to be given back to the customer.
   */
  calculateChange(
    totalAmount: Prisma.Decimal,
    paidAmount: Prisma.Decimal,
  ): Prisma.Decimal {
    if (paidAmount.gt(totalAmount)) {
      return paidAmount.sub(totalAmount);
    }
    return new Prisma.Decimal(0);
  }
}
