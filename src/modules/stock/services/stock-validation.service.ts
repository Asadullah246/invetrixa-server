import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LocationStatus, ProductType } from 'generated/prisma/enums';

/**
 * Centralized validation service for stock operations.
 * Eliminates repeated validation code across MovementService and TransferService.
 */
@Injectable()
export class StockValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates that all product IDs exist, belong to the tenant,
   * and are stockable (not VARIABLE/parent products).
   * @throws NotFoundException if any products are not found
   * @throws BadRequestException if any products are VARIABLE type
   */
  async validateProducts(
    tenantId: string,
    productIds: string[],
  ): Promise<void> {
    const uniqueProductIds = [...new Set(productIds)];

    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, tenantId, deletedAt: null },
      select: { id: true, name: true, productType: true },
    });

    if (products.length !== uniqueProductIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = uniqueProductIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Products not found: ${missingIds.join(', ')}`,
      );
    }

    // Check for VARIABLE (parent) products - they cannot have stock directly
    const variableProducts = products.filter(
      (p) => p.productType === ProductType.VARIABLE,
    );
    if (variableProducts.length > 0) {
      const names = variableProducts.map((p) => p.name).join(', ');
      throw new BadRequestException(
        `Cannot perform stock operations on parent products: ${names}. Stock should be managed on variant products.`,
      );
    }
  }

  /**
   * Validates that a location exists, belongs to the tenant, and is active.
   * @throws NotFoundException if location is not found
   * @returns Location info (id, name, code)
   */
  async validateLocation(
    tenantId: string,
    locationId: string,
  ): Promise<{ id: string; name: string; code: string | null }> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId, status: LocationStatus.ACTIVE },
      select: { id: true, name: true, code: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found.');
    }

    return location;
  }

  /**
   * Validates multiple locations exist, belong to the tenant, and are active.
   * @throws NotFoundException if any location is not found
   * @returns Map of locationId to location info
   */
  async validateLocations(
    tenantId: string,
    locationIds: string[],
  ): Promise<Map<string, { id: string; name: string; code: string | null }>> {
    const uniqueLocationIds = [...new Set(locationIds)];

    const locations = await this.prisma.location.findMany({
      where: { id: { in: uniqueLocationIds }, tenantId, status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
    });

    const locationMap = new Map(locations.map((l) => [l.id, l]));

    for (const locationId of uniqueLocationIds) {
      if (!locationMap.has(locationId)) {
        throw new NotFoundException(`Location not found: ${locationId}`);
      }
    }

    return locationMap;
  }

  /**
   * Validates that sufficient stock is available for the requested quantities.
   * Considers both on-hand quantity and reserved quantity.
   * @throws BadRequestException if any item has insufficient stock
   */
  async validateStockAvailability(
    tenantId: string,
    locationId: string,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<void> {
    // Fetch all balances in one query
    const productIds = items.map((i) => i.productId);
    const balances = await this.prisma.inventoryBalance.findMany({
      where: {
        tenantId,
        locationId,
        productId: { in: productIds },
      },
      include: {
        product: { select: { name: true } },
      },
    });

    const balanceMap = new Map(balances.map((b) => [b.productId, b]));

    for (const item of items) {
      const balance = balanceMap.get(item.productId);

      const onHand = balance?.onHandQuantity ?? 0;
      const reserved = balance?.reservedQuantity ?? 0;
      const available = onHand - reserved;

      if (available < item.quantity) {
        const productName = balance?.product?.name ?? item.productId;
        throw new BadRequestException(
          `Insufficient stock for "${productName}". On-hand: ${onHand}, Reserved: ${reserved}, Available: ${available}, Requested: ${item.quantity}`,
        );
      }
    }
  }

  /**
   * Get available quantity for a product at a location.
   * Returns onHandQuantity - reservedQuantity.
   */
  async getAvailableQuantity(
    tenantId: string,
    locationId: string,
    productId: string,
  ): Promise<{ onHand: number; reserved: number; available: number }> {
    const balance = await this.prisma.inventoryBalance.findUnique({
      where: { productId_locationId: { productId, locationId } },
    });

    const onHand = balance?.onHandQuantity ?? 0;
    const reserved = balance?.reservedQuantity ?? 0;

    return {
      onHand,
      reserved,
      available: onHand - reserved,
    };
  }
}
