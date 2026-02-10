import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  QueryCustomerDto,
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  CustomerResponseDto,
  CustomerWithAddressesResponseDto,
  CustomerListItemResponseDto,
  CustomerAddressResponseDto,
} from './dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { RequirePermission } from '../access-control/decorator/permission.decorator';
import { TenantId } from '@/common/decorator/tenant-id.decorator';
import { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import {
  ApiCreate,
  ApiGetAll,
  ApiGetOne,
  ApiUpdate,
  ApiDelete,
} from '@/common/decorator/api';
import { CurrentUserId } from '@/common/decorator/current-user-id.decorator';

@Controller('customers')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @ApiCreate('Create a new customer', {
    type: CustomerWithAddressesResponseDto,
  })
  @Post()
  @RequirePermission('Customer', 'customer.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerWithAddressesResponseDto> {
    return await this.customerService.create(
      tenantId,
      userId,
      createCustomerDto,
    );
  }

  @ApiGetAll('Get all customers', { type: CustomerListItemResponseDto })
  @Get()
  @RequirePermission('Customer', 'customer.view')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: QueryCustomerDto,
  ): Promise<PaginatedResponse<CustomerListItemResponseDto>> {
    return await this.customerService.findAll(tenantId, query);
  }

  @ApiGetOne('Get a customer by ID', { type: CustomerWithAddressesResponseDto })
  @Get(':id')
  @RequirePermission('Customer', 'customer.view')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<CustomerWithAddressesResponseDto> {
    return await this.customerService.findOne(tenantId, id);
  }

  @ApiUpdate('Update a customer', { type: CustomerResponseDto })
  @Patch(':id')
  @RequirePermission('Customer', 'customer.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return await this.customerService.update(tenantId, id, updateCustomerDto);
  }

  @ApiDelete('Delete a customer')
  @Delete(':id')
  @RequirePermission('Customer', 'customer.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.customerService.remove(tenantId, id);
  }

  // Address Endpoints

  @ApiCreate('Add an address to a customer', {
    type: CustomerAddressResponseDto,
  })
  @Post(':id/addresses')
  @RequirePermission('Customer', 'customer.update')
  @HttpCode(HttpStatus.CREATED)
  async addAddress(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() createAddressDto: CreateCustomerAddressDto,
  ): Promise<CustomerAddressResponseDto> {
    return await this.customerService.addAddress(
      tenantId,
      id,
      createAddressDto,
    );
  }

  @ApiUpdate('Update a customer address', { type: CustomerAddressResponseDto })
  @Patch(':id/addresses/:addressId')
  @RequirePermission('Customer', 'customer.update')
  @HttpCode(HttpStatus.OK)
  async updateAddress(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateCustomerAddressDto,
  ): Promise<CustomerAddressResponseDto> {
    return await this.customerService.updateAddress(
      tenantId,
      id,
      addressId,
      updateAddressDto,
    );
  }

  @ApiDelete('Remove a customer address')
  @Delete(':id/addresses/:addressId')
  @RequirePermission('Customer', 'customer.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAddress(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ): Promise<void> {
    await this.customerService.removeAddress(tenantId, id, addressId);
  }

  @ApiUpdate('Set an address as default', { type: CustomerAddressResponseDto })
  @Patch(':id/addresses/:addressId/default')
  @RequirePermission('Customer', 'customer.update')
  @HttpCode(HttpStatus.OK)
  async setDefaultAddress(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ): Promise<CustomerAddressResponseDto> {
    return await this.customerService.setDefaultAddress(
      tenantId,
      id,
      addressId,
    );
  }
}
