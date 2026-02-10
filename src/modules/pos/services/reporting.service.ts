import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma, SaleStatus, PaymentStatus } from 'generated/prisma/client';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDailySummary(tenantId: string, locationId: string, date: string) {
    // Assuming date is ISO YYYY-MM-DD
    const summary = await this.prisma.dailySalesSummary.findUnique({
      where: {
        date_locationId_tenantId: {
          tenantId,
          locationId,
          date: new Date(date),
        },
      },
    });
    return summary;
  }

  /**
   * Generates or updates the DailySalesSummary for a specific day and location.
   * This is computationally expensive so it should be run in a background job.
   */
  async generateDailySummary(
    tenantId: string,
    locationId: string,
    date: string,
  ) {
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    this.logger.debug(`Generating summary for ${locationId} on ${date}`);

    // 1. Aggregate Sales Data
    const salesAgg = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        locationId,
        status: {
          in: [
            SaleStatus.COMPLETED,
            SaleStatus.PARTIALLY_REFUNDED,
            SaleStatus.REFUNDED,
          ],
        },
        createdAt: {
          gte: targetDate,
          lt: nextDate,
        },
      },
      _count: {
        id: true, // Total sales count
      },
      _sum: {
        totalAmount: true, // Revenue (after discount & tax)
        taxAmount: true,
        discountAmount: true,
        // Assuming we can derive COGS if we join or simpler if stored on sale.
        // SaleItem has unitCost. Let's aggregate items for COGS.
      },
    });

    // 2. Aggregate COGS (Cost of Goods Sold)
    // Implementing COGS via raw query:

    // Using Raw Query for accurate aggregations is often safer for Reports
    // But let's stick to Prisma for consistency if possible.
    // Let's iterate sale items for COGS if needed, or better:
    // Update schema to store totalCost on Sale? Too late for schema change?
    // Let's skip COGS aggregation precision for this precise step or implement via raw query.
    // Implementing COGS via raw query:
    const cogsResult = await this.prisma.$queryRaw<{ total_cogs: number }[]>`
        SELECT SUM("si"."quantity" * "si"."unitCost") as "total_cogs"
        FROM "sale_items" "si"
        JOIN "sales" "s" ON "si"."saleId" = "s"."id"
        WHERE "s"."tenantId" = ${tenantId}
          AND "s"."locationId" = ${locationId}
          AND "s"."status" IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')::"SaleStatus"
          AND "s"."createdAt" >= ${targetDate}
          AND "s"."createdAt" < ${nextDate}
    `;
    const totalCOGS = cogsResult[0]?.total_cogs
      ? new Prisma.Decimal(cogsResult[0].total_cogs)
      : new Prisma.Decimal(0);

    // 3. Aggregate Refunds
    const refundAgg = await this.prisma.saleRefund.aggregate({
      where: {
        tenantId,
        // Refund date matches the summary date (Refunds happen on the day they happen, not necessarily sale date)
        // Wait, usually Daily Summary is by Transaction Date.
        // So we sum refunds occurring ON THIS DATE.
        processedAt: {
          gte: targetDate,
          lt: nextDate,
        },
        sale: {
          locationId, // Ensure refund belongs to this location
        },
      },
      _sum: {
        amount: true,
      },
    });

    // 4. Aggregate Payments by Method
    const payments = await this.prisma.salePayment.groupBy({
      by: ['method'],
      where: {
        sale: {
          tenantId,
          locationId,
          // Payments made ON THIS DATE
          // (Assuming payment date ~ sale date for POS, but strictly should filter by payment.processedAt)
        },
        processedAt: {
          gte: targetDate,
          lt: nextDate,
        },
        status: PaymentStatus.COMPLETED,
      },
      _sum: {
        amount: true,
      },
    });

    // Map payments
    let cashTotal = new Prisma.Decimal(0);
    let cardTotal = new Prisma.Decimal(0);
    let bkashTotal = new Prisma.Decimal(0);
    let nagadTotal = new Prisma.Decimal(0);
    let otherTotal = new Prisma.Decimal(0);

    for (const p of payments) {
      const amt = p._sum.amount || new Prisma.Decimal(0);
      switch (p.method) {
        case 'CASH':
          cashTotal = cashTotal.add(amt);
          break;
        case 'CARD':
          cardTotal = cardTotal.add(amt);
          break;
        case 'BKASH':
          bkashTotal = bkashTotal.add(amt);
          break;
        case 'NAGAD':
          nagadTotal = nagadTotal.add(amt);
          break;
        default:
          otherTotal = otherTotal.add(amt);
          break;
      }
    }

    // 5. Upsert Summary
    const totalSales = salesAgg._count.id;
    const totalRevenue = salesAgg._sum.totalAmount || new Prisma.Decimal(0);
    const totalDiscount = salesAgg._sum.discountAmount || new Prisma.Decimal(0);
    const totalTax = salesAgg._sum.taxAmount || new Prisma.Decimal(0);
    const totalRefunds = refundAgg._sum.amount || new Prisma.Decimal(0);

    await this.prisma.dailySalesSummary.upsert({
      where: {
        date_locationId_tenantId: {
          tenantId,
          locationId,
          date: targetDate,
        },
      },
      update: {
        totalSales,
        totalRevenue,
        totalCOGS,
        totalDiscount,
        totalTax,
        totalRefunds,
        cashTotal,
        cardTotal,
        bkashTotal,
        nagadTotal,
        otherTotal,
      },
      create: {
        tenantId,
        locationId,
        date: targetDate,
        totalSales,
        totalRevenue,
        totalCOGS,
        totalDiscount,
        totalTax,
        totalRefunds,
        cashTotal,
        cardTotal,
        bkashTotal,
        nagadTotal,
        otherTotal,
      },
    });

    this.logger.debug(`Summary updated for ${locationId} on ${date}`);
  }
}
