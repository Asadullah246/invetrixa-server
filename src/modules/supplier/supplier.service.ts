import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import { CreateSupplierDto, UpdateSupplierDto, QuerySupplierDto } from './dto';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new supplier
   */
  async create(tenantId: string, dto: CreateSupplierDto) {
    // Check name uniqueness within tenant
    const existing = await this.prisma.supplier.findFirst({
      where: { name: dto.name, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A supplier with this name already exists.');
    }

    return await this.prisma.supplier.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        contactName: dto.contactName,
        notes: dto.notes,
        tenantId,
      },
    });
  }

  /**
   * Get all suppliers with pagination and filtering
   */
  async findAll(tenantId: string, query: QuerySupplierDto) {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);

    const where = this.buildSupplierFilter(tenantId, filterParams);

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        ...paginationPrismaQuery,
        include: {
          _count: {
            select: { batches: true },
          },
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      meta: generatePaginationMeta({
        ...paginationData,
        total,
      }),
      data: suppliers,
    };
  }

  /**
   * Get a single supplier by ID
   */
  async findOne(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        _count: {
          select: { batches: true },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    return supplier;
  }

  /**
   * Update a supplier
   */
  async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
    // Check supplier exists
    const existing = await this.prisma.supplier.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new NotFoundException('Supplier not found.');
    }

    // Check name uniqueness if changing
    if (dto.name && dto.name !== existing.name) {
      const duplicateName = await this.prisma.supplier.findFirst({
        where: {
          name: dto.name,
          tenantId,
          deletedAt: null,
          id: { not: id },
        },
        select: { id: true },
      });

      if (duplicateName) {
        throw new ConflictException(
          'A supplier with this name already exists.',
        );
      }
    }

    return await this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        contactName: dto.contactName,
        notes: dto.notes,
      },
    });
  }

  /**
   * Soft delete a supplier
   */
  async remove(tenantId: string, id: string): Promise<void> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        _count: {
          select: { batches: true },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    // Check for batches using this supplier
    if (supplier._count.batches > 0) {
      throw new ConflictException(
        'Cannot delete supplier that has associated batches. Remove from batches first.',
      );
    }

    // Soft delete
    await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Build filter for supplier queries
   */
  private buildSupplierFilter(
    tenantId: string,
    filterParams: Record<string, unknown>,
  ): Prisma.SupplierWhereInput {
    const where: Prisma.SupplierWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Search filter (name, email, contactName)
    if (filterParams.search) {
      const searchTerm = filterParams.search as string;
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { contactName: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
