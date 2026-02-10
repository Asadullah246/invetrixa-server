import { forwardRef, Logger, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { EmailModule } from '@/common/services/email-service/email.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    EmailModule,
    AccessControlModule,
    forwardRef(() => AuthModule), // For AuthenticatedGuard
  ],
  controllers: [UsersController],
  providers: [UsersService, Logger],
  exports: [UsersService],
})
export class UsersModule {}
