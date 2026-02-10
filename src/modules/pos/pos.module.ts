import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { POSController } from './pos.controller';
import {
  TerminalService,
  SessionService,
  SaleService,
  CartService,
  PaymentService,
  RefundService,
  ReportingService,
  CartCleanupService,
} from './services';
import {
  POS_REPORTING_QUEUE,
  PosQueueService,
  PosReportingProcessor,
} from './queue';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [
    PrismaModule,
    AccessControlModule,
    AuthModule,
    StockModule,
    BullModule.registerQueue({
      name: POS_REPORTING_QUEUE,
    }),
  ],
  controllers: [POSController],
  providers: [
    TerminalService,
    SessionService,
    SaleService,
    CartService,
    PaymentService,
    RefundService,
    ReportingService,
    CartCleanupService,
    PosQueueService,
    PosReportingProcessor,
  ],
  exports: [
    TerminalService,
    SessionService,
    SaleService,
    CartService,
    PaymentService,
    RefundService,
    ReportingService,
    CartCleanupService,
    PosQueueService,
  ],
})
export class POSModule {}
