import { forwardRef, Module } from '@nestjs/common';
import { AccessControlService } from './services/access-control.service';
import { AccessControlGuard } from './access-control.guard';
import { RoleService } from './services/role.service';
import { AuthModule } from '../auth/auth.module';
import { RoleController } from './role.controller';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [RoleController],
  providers: [AccessControlService, AccessControlGuard, RoleService],
  exports: [AccessControlService, AccessControlGuard, RoleService],
})
export class AccessControlModule {}
