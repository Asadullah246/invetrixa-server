import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UnitTypesService } from '../tenants/services/unit-types.service';
import { MovementService } from '../stock/services';
import { CategoryService } from '../category/category.service';
import { SlugService } from '@/common/utils/slug.utils';
import { SkuService } from '@/common/utils/sku.utils';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: {} },
        { provide: SlugService, useValue: {} },
        { provide: SkuService, useValue: {} },
        { provide: UnitTypesService, useValue: {} },
        { provide: MovementService, useValue: {} },
        { provide: CategoryService, useValue: {} },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
