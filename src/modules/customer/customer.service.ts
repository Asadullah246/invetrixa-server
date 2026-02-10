import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  CustomerType,
  Prisma,
  Customer,
  CustomerAddress,
  AddressType,
} from 'generated/prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { getPagination, generatePaginationMeta } from '@/common/utils';
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
import { PaginatedResponse } from '@/common/dto/paginated-response.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new customer
   */
  async create(
    tenantId: string,
    userId: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerWithAddressesResponseDto> {
    this.validateCustomerData(dto);

    try {
      const customer = await this.prisma.customer.create({
        data: {
          tenantId,
          createdById: userId,
          customerType: dto.customerType,
          firstName: dto.firstName ?? '',
          lastName: dto.lastName,
          companyName: dto.companyName,
          taxId: dto.taxId,
          email: dto.email,
          phone: dto.phone,
          alternatePhone: dto.alternatePhone,
          tags: dto.tags || [],
          notes: dto.notes,
          addresses: dto.addresses?.length
            ? { create: dto.addresses }
            : undefined,
        },
        include: { addresses: true },
      });

      return this.transformToDetailDto(customer);
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  /**
   * Get all customers with filtering and pagination
   */
  async findAll(
    tenantId: string,
    query: QueryCustomerDto,
  ): Promise<PaginatedResponse<CustomerListItemResponseDto>> {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);

    const where = this.buildCustomerFilters(tenantId, filterParams);

    const [total, items] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        ...paginationPrismaQuery,
        include: { _count: { select: { addresses: true } } },
      }),
    ]);

    return {
      data: items.map((item) => this.transformToListItemDto(item)),
      meta: generatePaginationMeta({ ...paginationData, total }),
    };
  }

  /**
   * Get a single customer by ID
   */
  async findOne(
    tenantId: string,
    id: string,
  ): Promise<CustomerWithAddressesResponseDto> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { addresses: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.transformToDetailDto(customer);
  }

  /**
   * Update a customer
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    await this.verifyCustomerExists(tenantId, id);

    try {
      const updated = await this.prisma.customer.update({
        where: { id },
        data: dto,
      });

      return this.transformToDto(updated);
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  /**
   * Soft delete a customer
   */
  async remove(tenantId: string, id: string): Promise<void> {
    await this.verifyCustomerExists(tenantId, id);

    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Address Management

  /**
   * Add an address to a customer
   */
  async addAddress(
    tenantId: string,
    customerId: string,
    dto: CreateCustomerAddressDto,
  ): Promise<CustomerAddressResponseDto> {
    await this.verifyCustomerExists(tenantId, customerId);

    if (dto.isDefault) {
      await this.unsetDefaultAddresses(customerId, dto.addressType || 'BOTH');
    }

    const address = await this.prisma.customerAddress.create({
      data: { ...dto, customerId },
    });

    return this.transformToAddressDto(address);
  }

  /**
   * Update a customer address
   */
  async updateAddress(
    tenantId: string,
    customerId: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ): Promise<CustomerAddressResponseDto> {
    await this.verifyCustomerExists(tenantId, customerId);

    const address = await this.getAddressOrThrow(customerId, addressId);

    if (dto.isDefault) {
      await this.unsetDefaultAddresses(
        customerId,
        dto.addressType || address.addressType,
      );
    }

    const updated = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: dto,
    });

    return this.transformToAddressDto(updated);
  }

  /**
   * Remove an address
   */
  async removeAddress(
    tenantId: string,
    customerId: string,
    addressId: string,
  ): Promise<void> {
    await this.verifyCustomerExists(tenantId, customerId);
    await this.getAddressOrThrow(customerId, addressId);

    await this.prisma.customerAddress.delete({
      where: { id: addressId },
    });
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(
    tenantId: string,
    customerId: string,
    addressId: string,
  ): Promise<CustomerAddressResponseDto> {
    await this.verifyCustomerExists(tenantId, customerId);

    const address = await this.getAddressOrThrow(customerId, addressId);

    await this.unsetDefaultAddresses(customerId, address.addressType);

    const updated = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return this.transformToAddressDto(updated);
  }

  // Private Helper Methods

  /**
   * Handle Prisma unique constraint errors (P2002)
   */
  private handleUniqueConstraintError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target as string[] | undefined;
      if (target?.includes('phone')) {
        throw new ConflictException('Customer with this phone already exists');
      }
      if (target?.includes('email')) {
        throw new ConflictException('Customer with this email already exists');
      }
      throw new ConflictException(
        'A customer with these details already exists',
      );
    }
  }

  /**
   * Verify customer exists (lightweight check for address operations)
   */
  private async verifyCustomerExists(
    tenantId: string,
    id: string,
  ): Promise<void> {
    const exists = await this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
  }

  /**
   * Get address or throw if not found
   */
  private async getAddressOrThrow(
    customerId: string,
    addressId: string,
  ): Promise<CustomerAddress> {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found for this customer');
    }

    return address;
  }

  /**
   * Unset default addresses of a specific type for a customer
   */
  private async unsetDefaultAddresses(
    customerId: string,
    addressType: AddressType,
  ): Promise<void> {
    await this.prisma.customerAddress.updateMany({
      where: { customerId, addressType, isDefault: true },
      data: { isDefault: false },
    });
  }

  /**
   * Build filter for customer queries
   */
  private buildCustomerFilters(
    tenantId: string,
    filterParams: Omit<QueryCustomerDto, 'page' | 'limit' | 'sort' | 'sortBy'>,
  ): Prisma.CustomerWhereInput {
    const { search, customerType, status, tag } = filterParams;

    const where: Prisma.CustomerWhereInput = {
      tenantId,
      deletedAt: null,
      ...(customerType && { customerType }),
      ...(status && { status }),
      ...(tag && { tags: { has: tag } }),
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Validate customer data based on type
   */
  private validateCustomerData(dto: CreateCustomerDto): void {
    const type = dto.customerType ?? CustomerType.INDIVIDUAL;

    if (type === CustomerType.INDIVIDUAL && !dto.firstName && !dto.lastName) {
      throw new BadRequestException(
        'Individual customers must have a first name or last name',
      );
    }

    if (type === CustomerType.BUSINESS && !dto.companyName) {
      throw new BadRequestException(
        'Business customers must have a company name',
      );
    }
  }

  /**
   * Transform Prisma customer to Response DTO
   */
  private transformToDto(customer: Customer): CustomerResponseDto {
    const {
      id,
      customerType,
      firstName,
      lastName,
      companyName,
      taxId,
      email,
      phone,
      alternatePhone,
      status,
      tags,
      notes,
      tenantId,
      createdById,
      createdAt,
      updatedAt,
      deletedAt,
    } = customer;
    return {
      id,
      customerType,
      firstName,
      lastName,
      companyName,
      taxId,
      email,
      phone,
      alternatePhone,
      status,
      tags,
      notes,
      tenantId,
      createdById,
      createdAt,
      updatedAt,
      deletedAt,
    };
  }

  /**
   * Transform Prisma customer with relations to Detail Response DTO
   */
  private transformToDetailDto(
    customer: Customer & { addresses?: CustomerAddress[] },
  ): CustomerWithAddressesResponseDto {
    return {
      ...this.transformToDto(customer),
      addresses:
        customer.addresses?.map((addr) => this.transformToAddressDto(addr)) ||
        [],
    };
  }

  /**
   * Transform Prisma customer with count to ListItem Response DTO
   */
  private transformToListItemDto(
    customer: Customer & { _count: { addresses: number } },
  ): CustomerListItemResponseDto {
    return {
      ...this.transformToDto(customer),
      _count: customer._count,
    };
  }

  /**
   * Transform Prisma address to Address Response DTO
   */
  private transformToAddressDto(
    address: CustomerAddress,
  ): CustomerAddressResponseDto {
    const {
      id,
      addressType,
      label,
      isDefault,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      latitude,
      longitude,
      createdAt,
      updatedAt,
    } = address;
    return {
      id,
      addressType,
      label,
      isDefault,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      latitude,
      longitude,
      createdAt,
      updatedAt,
    };
  }
}
