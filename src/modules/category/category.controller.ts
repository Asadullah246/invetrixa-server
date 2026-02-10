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
import { CategoryService } from './category.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  QueryCategoryDto,
  CategoryResponseDto,
  CategoryWithCountResponseDto,
  CategoryDetailResponseDto,
} from './dto';
import { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { RequirePermission } from '../access-control/decorator/permission.decorator';
import { TenantId } from '@/common/decorator/tenant-id.decorator';
import {
  ApiCreate,
  ApiGetAll,
  ApiGetOne,
  ApiUpdate,
  ApiDelete,
} from '@/common/decorator/api';

@Controller('categories')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiCreate('Create a new category', { type: CategoryResponseDto })
  @Post()
  @RequirePermission('Category', 'category.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return await this.categoryService.create(tenantId, createCategoryDto);
  }

  @ApiGetAll('Get all categories with filtering and pagination', {
    type: CategoryWithCountResponseDto,
  })
  @Get()
  @RequirePermission('Category', 'category.view')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: QueryCategoryDto,
  ): Promise<PaginatedResponse<CategoryWithCountResponseDto>> {
    return await this.categoryService.findAll(tenantId, query);
  }

  @ApiGetOne('Get a single category by ID or slug', {
    type: CategoryDetailResponseDto,
  })
  @Get(':identifier')
  @RequirePermission('Category', 'category.view')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @TenantId() tenantId: string,
    @Param('identifier') identifier: string,
  ): Promise<CategoryDetailResponseDto> {
    return await this.categoryService.findOne(tenantId, identifier);
  }

  @ApiUpdate('Update a category', {
    type: CategoryResponseDto,
    additionalResponses: [
      { status: 400, description: 'Circular reference detected' },
    ],
  })
  @Patch(':id')
  @RequirePermission('Category', 'category.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return await this.categoryService.update(tenantId, id, updateCategoryDto);
  }

  @ApiDelete('Delete a category (soft delete)')
  @Delete(':id')
  @RequirePermission('Category', 'category.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.categoryService.remove(tenantId, id);
  }
}
