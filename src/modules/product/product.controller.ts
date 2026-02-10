import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
  ProductResponseDto,
  ProductDetailResponseDto,
  CreateProductResponseDto,
  ProductListItemDto,
} from './dto';
import { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { RequirePermission } from '../access-control/decorator/permission.decorator';
import { TenantId } from '@/common/decorator/tenant-id.decorator';
import { CurrentUserId } from '@/common/decorator/current-user-id.decorator';
import {
  ApiCreate,
  ApiGetAll,
  ApiGetOne,
  ApiUpdate,
  ApiDelete,
} from '@/common/decorator/api';

@ApiTags('Products')
@Controller('products')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiCreate('Create a new product', { type: CreateProductResponseDto })
  @Post()
  @RequirePermission('Product', 'product.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() createProductDto: CreateProductDto,
  ): Promise<CreateProductResponseDto> {
    return await this.productService.create(tenantId, userId, createProductDto);
  }

  @ApiGetAll('Get all products with filtering and pagination', {
    type: ProductListItemDto,
  })
  @Get()
  @RequirePermission('Product', 'product.view')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: QueryProductDto,
  ): Promise<PaginatedResponse<ProductListItemDto>> {
    return await this.productService.findAll(tenantId, query);
  }

  @ApiGetOne('Get a single product by ID or slug', {
    type: ProductDetailResponseDto,
  })
  @Get(':identifier')
  @RequirePermission('Product', 'product.view')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @TenantId() tenantId: string,
    @Param('identifier') identifier: string,
  ): Promise<ProductDetailResponseDto> {
    return await this.productService.findOne(tenantId, identifier);
  }

  @ApiUpdate('Update a product', {
    type: ProductResponseDto,
    additionalResponses: [{ status: 409, description: 'SKU already exists' }],
  })
  @Patch(':id')
  @RequirePermission('Product', 'product.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return await this.productService.update(tenantId, id, updateProductDto);
  }

  @ApiDelete('Delete a product (soft delete)', {
    additionalResponses: [
      { status: 409, description: 'Product has active variants' },
    ],
  })
  @Delete(':id')
  @RequirePermission('Product', 'product.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.productService.remove(tenantId, id);
  }
}
