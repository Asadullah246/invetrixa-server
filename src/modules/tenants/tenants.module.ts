import { forwardRef, Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '@/common/services/email-service/email.module';
import { UnitTypesService } from './services/unit-types.service';
import { TenantRoleInitializerService } from './services/tenant-role-initializer.service';

@Module({
  imports: [AccessControlModule, forwardRef(() => AuthModule), EmailModule],
  controllers: [TenantsController],
  providers: [TenantsService, UnitTypesService, TenantRoleInitializerService],
  exports: [TenantsService, UnitTypesService, TenantRoleInitializerService],
})
export class TenantsModule {}
