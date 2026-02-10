import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StockController } from './stock.controller';
import {
  MovementService,
  BalanceService,
  ValuationService,
  TransferService,
  StockValidationService,
  ReservationService,
} from './services';
import {
  RESERVATION_QUEUE,
  ReservationQueueProcessor,
  ReservationQueueService,
} from './queue';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AccessControlModule,
    AuthModule,
    BullModule.registerQueue({
      name: RESERVATION_QUEUE,
    }),
  ],
  controllers: [StockController],
  providers: [
    // Core services
    MovementService,
    BalanceService,
    ValuationService,
    TransferService,
    StockValidationService,
    ReservationService,
    // Queue processors and services
    ReservationQueueProcessor,
    ReservationQueueService,
  ],
  exports: [
    MovementService,
    BalanceService,
    ValuationService,
    TransferService,
    StockValidationService,
    ReservationService,
    ReservationQueueService,
  ],
})
export class StockModule {}
