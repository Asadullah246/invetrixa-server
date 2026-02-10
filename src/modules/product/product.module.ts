import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PricingService } from './pricing.service';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SlugService } from '@/common/utils/slug.utils';
import { SkuService } from '@/common/utils/sku.utils';
import { StockModule } from '../stock/stock.module';
import { TenantsModule } from '../tenants/tenants.module';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [
    PrismaModule,
    AccessControlModule,
    AuthModule,
    StockModule,
    TenantsModule,
    CategoryModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, PricingService, SlugService, SkuService],
  exports: [ProductService, PricingService],
})
export class ProductModule {}
