import { Test, TestingModule } from '@nestjs/testing';
import { ModulesDefinitionController } from './modules-definition.controller';
import { ModulesDefinitionService } from './modules-definition.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { AccessControlService } from '../access-control/services/access-control.service';

describe('ModulesDefinitionController', () => {
  let controller: ModulesDefinitionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModulesDefinitionController],
      providers: [
        ModulesDefinitionService,
        { provide: PrismaService, useValue: {} },
        { provide: AccessControlService, useValue: {} },
      ],
    })
      .overrideGuard(AccessControlGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ModulesDefinitionController>(
      ModulesDefinitionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
