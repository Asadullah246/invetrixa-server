import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  Prisma,
  SaleStatus,
  StockReferenceType,
} from 'generated/prisma/client';
import {
  CreateCartDto,
  AddCartItemDto,
  UpdateCartItemDto,
  CartResponseDto,
} from '../dto';
import { ReservationService } from '@/modules/stock/services';
import { generateSaleNumber } from '../utils';

// Type for Sale with includes
type SaleWithIncludes = Prisma.SaleGetPayload<{
  include: {
    items: {
      include: {
        product: { select: { id: true; name: true; sku: true } };
      };
    };
  };
}>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationService: ReservationService,
  ) {}

  private readonly includeRelations = {
    items: {
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    },
  };

  /**
   * Create a new cart (draft sale)
   */
  async createCart(
    tenantId: string,
    userId: string,
    dto: CreateCartDto,
  ): Promise<{ message: string; data: CartResponseDto }> {
    // terminalId is optional for BD market - many shops don't have dedicated POS hardware

    const sale = await this.prisma.$transaction(async (tx) => {
      const saleNumber = await generateSaleNumber(tenantId, tx);

      return tx.sale.create({
        data: {
          saleNumber,
          status: SaleStatus.DRAFT,
          subtotal: 0,
          totalAmount: 0,
          paidAmount: 0,
          changeAmount: 0,
          locationId: dto.locationId,
          terminalId: dto.terminalId, // Optional
          customerId: dto.customerId,
          sessionId: dto.sessionId,
          cashierId: userId,
          tenantId,
          notes: dto.notes,
        },
        include: this.includeRelations,
      });
    });

    return {
      message: 'Cart created successfully',
      data: this.formatResponse(sale),
    };
  }

  /**
   * Add item to cart
   */
  async addItem(
    tenantId: string,
    userId: string,
    cartId: string,
    dto: AddCartItemDto,
  ): Promise<CartResponseDto> {
    const cart = await this.getCartOrThrow(tenantId, cartId);

    // Get product info
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Attempt to reserve stock
    await this.reservationService.create(tenantId, userId, {
      productId: dto.productId,
      locationId: cart.locationId,
      quantity: dto.quantity,
      referenceType: StockReferenceType.SALE,
      referenceId: cartId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins
    });

    const unitPrice = dto.unitPrice ?? Number(product.minSellingPrice ?? 0);
    const discountAmount = dto.discountAmount ?? 0;
    const lineTotal = unitPrice * dto.quantity - discountAmount * dto.quantity;

    // Add or update item in cart
    const existingItem = await this.prisma.saleItem.findFirst({
      where: {
        saleId: cartId,
        productId: dto.productId,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      if (existingItem) {
        // Update existing
        const newQty = existingItem.quantity + dto.quantity;
        const newTotal =
          Number(existingItem.unitPrice) * newQty -
          Number(existingItem.discountAmount) * newQty;

        await tx.saleItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQty,
            lineTotal: newTotal,
          },
        });
      } else {
        // Create new
        await tx.saleItem.create({
          data: {
            saleId: cartId,
            productId: dto.productId,
            productName: product.name,
            productSku: product.sku,
            quantity: dto.quantity,
            unitPrice,
            // unitCost? We usually calc this at completion (FIFO).
            unitCost: 0,
            discountAmount,
            lineTotal,
            notes: dto.notes,
          },
        });
      }

      await this.recalculateCart(tx, cartId);
    });

    const updatedCart = await this.getCartOrThrow(tenantId, cartId);
    return this.formatResponse(updatedCart);
  }

  /**
   * Update cart item qty
   */
  async updateItem(
    tenantId: string,
    userId: string,
    cartId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const cart = await this.getCartOrThrow(tenantId, cartId);

    const item = await this.prisma.saleItem.findFirst({
      where: { id: itemId, saleId: cartId },
    });

    if (!item) throw new NotFoundException('Item not found in cart');

    // Update reservation logic: release old, reserve new
    await this.releaseReservations(tenantId, cartId, item.productId);

    await this.reservationService.create(tenantId, userId, {
      productId: item.productId,
      locationId: cart.locationId,
      quantity: dto.quantity,
      referenceType: StockReferenceType.SALE,
      referenceId: cartId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    await this.prisma.$transaction(async (tx) => {
      const unitPrice = dto.unitPrice ?? Number(item.unitPrice);
      const discountAmount = dto.discountAmount ?? Number(item.discountAmount);
      const lineTotal =
        unitPrice * dto.quantity - discountAmount * dto.quantity;

      await tx.saleItem.update({
        where: { id: itemId },
        data: {
          quantity: dto.quantity,
          unitPrice,
          discountAmount,
          lineTotal,
          notes: dto.notes,
        },
      });

      await this.recalculateCart(tx, cartId);
    });

    return this.formatResponse(await this.getCartOrThrow(tenantId, cartId));
  }

  /**
   * Remove item
   */
  async removeItem(
    tenantId: string,
    cartId: string,
    itemId: string,
  ): Promise<CartResponseDto> {
    // Check if cart exists first (to ensure tenant/existence)
    await this.getCartOrThrow(tenantId, cartId);

    const item = await this.prisma.saleItem.findFirst({
      where: { id: itemId, saleId: cartId },
    });

    if (!item) throw new NotFoundException('Item not found');

    await this.releaseReservations(tenantId, cartId, item.productId);

    await this.prisma.$transaction(async (tx) => {
      await tx.saleItem.delete({ where: { id: itemId } });
      await this.recalculateCart(tx, cartId);
    });

    return this.formatResponse(await this.getCartOrThrow(tenantId, cartId));
  }

  /**
   * Get Cart
   */
  async getCart(tenantId: string, cartId: string): Promise<CartResponseDto> {
    const cart = await this.getCartOrThrow(tenantId, cartId);
    return this.formatResponse(cart);
  }

  // --- Helpers ---

  private async getCartOrThrow(tenantId: string, cartId: string) {
    const cart = await this.prisma.sale.findFirst({
      where: { id: cartId, tenantId, status: SaleStatus.DRAFT },
      include: this.includeRelations,
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  private async recalculateCart(tx: Prisma.TransactionClient, cartId: string) {
    const items = await tx.saleItem.findMany({ where: { saleId: cartId } });

    let subtotal = new Prisma.Decimal(0);
    // discountAmount on Sale is global discount. Line items already have discounts subtracted in lineTotal.
    // If we support global discount, we need to respect it.
    // For now assuming 0 global discount or preserving existing.

    const currentSale = await tx.sale.findUnique({
      where: { id: cartId },
      select: { discountAmount: true },
    });
    const globalDiscount = currentSale?.discountAmount ?? new Prisma.Decimal(0);

    for (const item of items) {
      subtotal = subtotal.add(item.lineTotal);
    }

    const taxAmount = new Prisma.Decimal(0); // TODO: Tax logic
    const totalAmount = subtotal.sub(globalDiscount).add(taxAmount);

    await tx.sale.update({
      where: { id: cartId },
      data: {
        subtotal,
        totalAmount,
      },
    });
  }

  private async releaseReservations(
    tenantId: string,
    cartId: string,
    productId: string,
  ) {
    // Find all active Sale reservations for this cart/product
    const reservations = await this.prisma.stockReservation.findMany({
      where: {
        tenantId,
        referenceId: cartId,
        referenceType: StockReferenceType.SALE,
        productId,
        status: 'ACTIVE', // ReservationStatus.ACTIVE
      },
    });

    for (const res of reservations) {
      await this.reservationService.release(tenantId, res.id);
    }
  }

  /**
   * Format sale for response
   */

  private formatResponse(sale: SaleWithIncludes): CartResponseDto {
    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      status: sale.status,
      locationId: sale.locationId,
      customerId: sale.customerId ?? undefined,
      subtotal: Number(sale.subtotal),
      discountAmount: Number(sale.discountAmount),
      taxAmount: Number(sale.taxAmount),
      totalAmount: Number(sale.totalAmount),
      items:
        sale.items?.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discountAmount: Number(item.discountAmount),
          lineTotal: Number(item.lineTotal),
        })) || [],
    };
  }
}
