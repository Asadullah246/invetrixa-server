import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SlugService } from '@/common/utils/slug.utils';
import { SkuService } from '@/common/utils/sku.utils';
import { UnitTypesService } from '../tenants/services/unit-types.service';
import { MovementService } from '../stock/services';
import { CategoryService } from '../category/category.service';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { AccessControlService } from '../access-control/services/access-control.service';

describe('ProductController', () => {
  let controller: ProductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        ProductService,
        { provide: PrismaService, useValue: {} },
        { provide: SlugService, useValue: {} },
        { provide: SkuService, useValue: {} },
        { provide: UnitTypesService, useValue: {} },
        { provide: MovementService, useValue: {} },
        { provide: CategoryService, useValue: {} },
        { provide: AccessControlService, useValue: {} },
      ],
    })
      .overrideGuard(AccessControlGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductController>(ProductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
