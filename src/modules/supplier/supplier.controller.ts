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
import { SupplierService } from './supplier.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  QuerySupplierDto,
  SupplierResponseDto,
  SupplierWithCountResponseDto,
} from './dto';
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

@Controller('suppliers')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @ApiCreate('Create a new supplier', { type: SupplierResponseDto })
  @Post()
  @RequirePermission('Supplier', 'supplier.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    return await this.supplierService.create(tenantId, createSupplierDto);
  }

  @ApiGetAll('Get all suppliers with pagination', {
    type: SupplierWithCountResponseDto,
  })
  @Get()
  @RequirePermission('Supplier', 'supplier.view')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: QuerySupplierDto,
  ) {
    return await this.supplierService.findAll(tenantId, query);
  }

  @ApiGetOne('Get a single supplier by ID', {
    type: SupplierWithCountResponseDto,
  })
  @Get(':id')
  @RequirePermission('Supplier', 'supplier.view')
  @HttpCode(HttpStatus.OK)
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return await this.supplierService.findOne(tenantId, id);
  }

  @ApiUpdate('Update a supplier', {
    type: SupplierResponseDto,
    additionalResponses: [
      { status: 409, description: 'Supplier name already exists' },
    ],
  })
  @Patch(':id')
  @RequirePermission('Supplier', 'supplier.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return await this.supplierService.update(tenantId, id, updateSupplierDto);
  }

  @ApiDelete('Delete a supplier', {
    additionalResponses: [
      { status: 409, description: 'Supplier has associated batches' },
    ],
  })
  @Delete(':id')
  @RequirePermission('Supplier', 'supplier.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.supplierService.remove(tenantId, id);
  }
}
