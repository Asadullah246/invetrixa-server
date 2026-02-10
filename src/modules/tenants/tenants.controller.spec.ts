import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/common/services/email-service/email.service';
import { AuthService } from '../auth/auth.service';
import { UnitTypesService } from './services/unit-types.service';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { AccessControlService } from '../access-control/services/access-control.service';
import { TenantRoleInitializerService } from './services/tenant-role-initializer.service';

describe('TenantsController', () => {
  let controller: TenantsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: UnitTypesService, useValue: {} },
        { provide: AccessControlService, useValue: {} },
        { provide: TenantRoleInitializerService, useValue: {} },
      ],
    })
      .overrideGuard(AccessControlGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TenantsController>(TenantsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
