/**
 * Seed Demo Transfers
 *
 * Creates sample stock transfers between locations.
 */

import {
  PrismaClient,
  TransferStatus,
  StockMovementType,
  StockReferenceType,
  StockMovementStatus,
  ProductType,
  Prisma,
} from 'generated/prisma/client';
import {
  DEMO_TENANT_ID,
  DEMO_LOCATION_IDS,
  DEMO_TRANSFER_IDS,
  DEMO_USER_IDS,
} from './constants';

interface TransferData {
  id: string;
  number: string;
  fromLocationId: string;
  toLocationId: string;
  status: TransferStatus;
  productCount: number;
}

export async function seedDemoTransfers(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Get some demo products (variants only, not parents)
    const products = await tx.product.findMany({
      where: {
        tenantId: DEMO_TENANT_ID,
        id: { startsWith: 'demo-product-' },
        productType: { not: ProductType.VARIABLE },
      },
      select: { id: true, name: true, sku: true },
      take: 10,
    });

    if (products.length < 6) {
      console.log('   ⚠️  Not enough products to create transfers');
      return;
    }

    const transfers: TransferData[] = [
      {
        id: DEMO_TRANSFER_IDS.TRANSFER_1,
        number: 'TRF-DEMO-001',
        fromLocationId: DEMO_LOCATION_IDS.MAIN_WAREHOUSE,
        toLocationId: DEMO_LOCATION_IDS.STORE_DHAKA,
        status: TransferStatus.COMPLETED,
        productCount: 3,
      },
      {
        id: DEMO_TRANSFER_IDS.TRANSFER_2,
        number: 'TRF-DEMO-002',
        fromLocationId: DEMO_LOCATION_IDS.MAIN_WAREHOUSE,
        toLocationId: DEMO_LOCATION_IDS.STORE_CHITTAGONG,
        status: TransferStatus.IN_TRANSIT,
        productCount: 2,
      },
      {
        id: DEMO_TRANSFER_IDS.TRANSFER_3,
        number: 'TRF-DEMO-003',
        fromLocationId: DEMO_LOCATION_IDS.STORE_DHAKA,
        toLocationId: DEMO_LOCATION_IDS.STORE_CHITTAGONG,
        status: TransferStatus.DRAFT,
        productCount: 2,
      },
    ];

    let transferCount = 0;
    let productStartIndex = 0;

    for (const transfer of transfers) {
      // Upsert transfer
      const created = await tx.stockTransfer.upsert({
        where: {
          transferNumber_tenantId: {
            transferNumber: transfer.number,
            tenantId: DEMO_TENANT_ID,
          },
        },
        create: {
          id: transfer.id,
          transferNumber: transfer.number,
          fromLocationId: transfer.fromLocationId,
          toLocationId: transfer.toLocationId,
          status: transfer.status,
          shippedAt:
            transfer.status === TransferStatus.COMPLETED ||
            transfer.status === TransferStatus.IN_TRANSIT
              ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
              : null,
          receivedAt:
            transfer.status === TransferStatus.COMPLETED
              ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
              : null,
          note: `Demo transfer - ${transfer.status}`,
          tenantId: DEMO_TENANT_ID,
          createdById: DEMO_USER_IDS.MANAGER_1,
        },
        update: {
          status: transfer.status,
        },
      });

      // Create transfer items
      const selectedProducts = products.slice(
        productStartIndex,
        productStartIndex + transfer.productCount,
      );
      productStartIndex += transfer.productCount;

      for (const product of selectedProducts) {
        const requestedQty = 10;
        const shippedQty =
          transfer.status !== TransferStatus.DRAFT ? requestedQty : 0;
        const receivedQty =
          transfer.status === TransferStatus.COMPLETED ? requestedQty : 0;
        const unitCost = new Prisma.Decimal(500);

        const itemId = `${transfer.id}-${product.id}`;

        await tx.stockTransferItem.upsert({
          where: {
            transferId_productId: {
              transferId: created.id,
              productId: product.id,
            },
          },
          create: {
            id: itemId,
            transferId: created.id,
            productId: product.id,
            requestedQuantity: requestedQty,
            shippedQuantity: shippedQty,
            receivedQuantity: receivedQty,
            shippedUnitCost: shippedQty > 0 ? unitCost : null,
          },
          update: {
            requestedQuantity: requestedQty,
            shippedQuantity: shippedQty,
            receivedQuantity: receivedQty,
          },
        });

        // Create stock movements for completed/in-transit transfers
        if (transfer.status !== TransferStatus.DRAFT) {
          // OUT movement from source
          const outMovementId =
            `demo-transfer-out-${transfer.number}-${product.sku}`.toLowerCase();

          const existingOut = await tx.stockMovement.findUnique({
            where: { id: outMovementId },
          });

          if (!existingOut) {
            await tx.stockMovement.create({
              data: {
                id: outMovementId,
                movementType: StockMovementType.OUT,
                quantity: shippedQty,
                unitCost,
                totalCost: unitCost.mul(shippedQty),
                referenceType: StockReferenceType.TRANSFER,
                referenceId: created.id,
                status: StockMovementStatus.COMPLETED,
                note: `Transfer out: ${transfer.number}`,
                productId: product.id,
                locationId: transfer.fromLocationId,
                tenantId: DEMO_TENANT_ID,
                createdById: DEMO_USER_IDS.MANAGER_1,
                transferId: created.id,
              },
            });
          }

          // IN movement at destination (only for completed)
          if (transfer.status === TransferStatus.COMPLETED) {
            const inMovementId =
              `demo-transfer-in-${transfer.number}-${product.sku}`.toLowerCase();

            const existingIn = await tx.stockMovement.findUnique({
              where: { id: inMovementId },
            });

            if (!existingIn) {
              await tx.stockMovement.create({
                data: {
                  id: inMovementId,
                  movementType: StockMovementType.IN,
                  quantity: receivedQty,
                  unitCost,
                  totalCost: unitCost.mul(receivedQty),
                  referenceType: StockReferenceType.TRANSFER,
                  referenceId: created.id,
                  status: StockMovementStatus.COMPLETED,
                  note: `Transfer in: ${transfer.number}`,
                  productId: product.id,
                  locationId: transfer.toLocationId,
                  tenantId: DEMO_TENANT_ID,
                  createdById: DEMO_USER_IDS.MANAGER_1,
                  transferId: created.id,
                },
              });
            }
          }
        }
      }

      transferCount++;
    }

    console.log(`   ✅ ${transferCount} stock transfers created`);
    console.log(`      - 1 COMPLETED (Warehouse → Dhaka)`);
    console.log(`      - 1 IN_TRANSIT (Warehouse → Chittagong)`);
    console.log(`      - 1 DRAFT (Dhaka → Chittagong)`);
  });
}
