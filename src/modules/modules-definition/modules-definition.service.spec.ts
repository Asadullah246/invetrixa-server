import { Test, TestingModule } from '@nestjs/testing';
import { ModulesDefinitionService } from './modules-definition.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('ModulesDefinitionService', () => {
  let service: ModulesDefinitionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModulesDefinitionService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<ModulesDefinitionService>(ModulesDefinitionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
