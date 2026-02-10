import { Test, TestingModule } from '@nestjs/testing';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ModulesDefinitionService } from '../modules-definition/modules-definition.service';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { AccessControlService } from '../access-control/services/access-control.service';

describe('PackagesController', () => {
  let controller: PackagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackagesController],
      providers: [
        PackagesService,
        { provide: PrismaService, useValue: {} },
        { provide: ModulesDefinitionService, useValue: {} },
        { provide: AccessControlService, useValue: {} },
      ],
    })
      .overrideGuard(AccessControlGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PackagesController>(PackagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
