/**
 * Seed Demo Inventory
 *
 * Creates initial stock for all products:
 * - Stock movements (type: IN)
 * - Valuation layers
 * - Inventory balances
 */

import {
  PrismaClient,
  StockMovementType,
  StockReferenceType,
  StockMovementStatus,
  ProductType,
  Prisma,
} from 'generated/prisma/client';
import { faker } from '@faker-js/faker';
import {
  DEMO_TENANT_ID,
  DEMO_LOCATION_IDS,
  DEMO_USER_IDS,
  DEMO_CONFIG,
} from './constants';

export async function seedDemoInventory(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Get all demo products (exclude VARIABLE parents - only stock variants)
    const products = await tx.product.findMany({
      where: {
        tenantId: DEMO_TENANT_ID,
        id: { startsWith: 'demo-product-' },
        productType: { not: ProductType.VARIABLE },
      },
      select: { id: true, name: true, sku: true },
    });

    const locations = [
      {
        id: DEMO_LOCATION_IDS.MAIN_WAREHOUSE,
        name: 'Main Warehouse',
        minStock: DEMO_CONFIG.WAREHOUSE_STOCK_MIN,
        maxStock: DEMO_CONFIG.WAREHOUSE_STOCK_MAX,
      },
      {
        id: DEMO_LOCATION_IDS.STORE_DHAKA,
        name: 'Store Dhaka',
        minStock: DEMO_CONFIG.STORE_STOCK_MIN,
        maxStock: DEMO_CONFIG.STORE_STOCK_MAX,
      },
      {
        id: DEMO_LOCATION_IDS.STORE_CHITTAGONG,
        name: 'Store Chittagong',
        minStock: DEMO_CONFIG.STORE_STOCK_MIN,
        maxStock: DEMO_CONFIG.STORE_STOCK_MAX,
      },
    ];

    let movementCount = 0;
    let balanceCount = 0;

    for (const product of products) {
      for (const location of locations) {
        const quantity = faker.number.int({
          min: location.minStock,
          max: location.maxStock,
        });
        const unitCost = new Prisma.Decimal(
          faker.number.int({
            min: DEMO_CONFIG.MIN_COST,
            max: DEMO_CONFIG.MAX_COST,
          }),
        );
        const totalCost = unitCost.mul(quantity);

        const movementId =
          `demo-movement-${product.sku}-${location.id}`.toLowerCase();
        const layerId =
          `demo-layer-${product.sku}-${location.id}`.toLowerCase();
        const balanceId =
          `demo-balance-${product.sku}-${location.id}`.toLowerCase();

        // Check if movement already exists
        const existingMovement = await tx.stockMovement.findUnique({
          where: { id: movementId },
        });

        if (!existingMovement) {
          // Create stock movement
          await tx.stockMovement.create({
            data: {
              id: movementId,
              movementType: StockMovementType.IN,
              quantity,
              unitCost,
              totalCost,
              referenceType: StockReferenceType.PURCHASE,
              referenceId: 'DEMO-INITIAL-STOCK',
              status: StockMovementStatus.COMPLETED,
              note: 'Initial demo stock',
              productId: product.id,
              locationId: location.id,
              tenantId: DEMO_TENANT_ID,
              createdById: DEMO_USER_IDS.OWNER,
            },
          });
          movementCount++;
        }

        // Upsert valuation layer
        const existingLayer = await tx.valuationLayer.findUnique({
          where: { id: layerId },
        });

        if (!existingLayer) {
          await tx.valuationLayer.create({
            data: {
              id: layerId,
              unitCost,
              originalQty: quantity,
              remainingQty: quantity,
              productId: product.id,
              locationId: location.id,
              tenantId: DEMO_TENANT_ID,
              sourceMovementId: movementId,
            },
          });
        } else {
          await tx.valuationLayer.update({
            where: { id: layerId },
            data: {
              remainingQty: quantity,
            },
          });
        }

        // Upsert inventory balance
        await tx.inventoryBalance.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: location.id,
            },
          },
          create: {
            id: balanceId,
            onHandQuantity: quantity,
            reservedQuantity: 0,
            productId: product.id,
            locationId: location.id,
            tenantId: DEMO_TENANT_ID,
          },
          update: {
            onHandQuantity: quantity,
          },
        });
        balanceCount++;
      }
    }

    console.log(`   ✅ Inventory seeded for ${products.length} products`);
    console.log(`      - ${movementCount} stock movements created`);
    console.log(`      - ${balanceCount} inventory balances updated`);
  });
}
