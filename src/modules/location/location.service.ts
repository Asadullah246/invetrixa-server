import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import { CreateLocationDto, UpdateLocationDto, QueryLocationDto } from './dto';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new location with optional address
   */
  async create(tenantId: string, userId: string, dto: CreateLocationDto) {
    // Check code uniqueness within tenant if provided
    if (dto.code) {
      const existingCode = await this.prisma.location.findFirst({
        where: { code: dto.code, tenantId },
        select: { id: true },
      });

      if (existingCode) {
        throw new ConflictException(
          'A location with this code already exists.',
        );
      }
    }

    // Check email uniqueness (globally unique)
    const existingEmail = await this.prisma.location.findFirst({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new ConflictException('A location with this email already exists.');
    }

    // Check phone uniqueness (globally unique)
    const existingPhone = await this.prisma.location.findFirst({
      where: { phone: dto.phone },
      select: { id: true },
    });
    if (existingPhone) {
      throw new ConflictException('A location with this phone already exists.');
    }

    // Create location with optional nested address
    const location = await this.prisma.location.create({
      data: {
        name: dto.name,
        code: dto.code,
        type: dto.type,
        subType: dto.subType,
        email: dto.email,
        phone: dto.phone,
        businessHours: dto.businessHours,
        totalCapacity: dto.totalCapacity,
        status: dto.status,
        establishedYear: dto.establishedYear
          ? new Date(dto.establishedYear)
          : undefined,
        tenantId,
        createdByUserId: userId,
        // Create nested address if provided
        address: dto.address
          ? {
              create: {
                addressLine1: dto.address.addressLine1,
                addressLine2: dto.address.addressLine2,
                city: dto.address.city,
                state: dto.address.state,
                postalCode: dto.address.postalCode,
                country: dto.address.country,
                latitude: dto.address.latitude,
                longitude: dto.address.longitude,
                googleMapUrl: dto.address.googleMapUrl,
              },
            }
          : undefined,
      },
      include: {
        address: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return this.formatLocationResponse(location);
  }

  /**
   * Get all locations with filtering and pagination
   */
  async findAll(tenantId: string, query: QueryLocationDto) {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);

    // Build where clause
    const where = this.buildLocationFilter(tenantId, filterParams);

    // Execute queries in parallel
    const [locations, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        ...paginationPrismaQuery,
        include: {
          address: true,
        },
      }),
      this.prisma.location.count({ where }),
    ]);

    return {
      meta: generatePaginationMeta({
        ...paginationData,
        total,
      }),
      data: locations,
    };
  }

  /**
   * Get a single location by ID
   */
  async findOne(tenantId: string, id: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, tenantId },
      include: {
        address: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found.');
    }

    return this.formatLocationResponse(location);
  }

  /**
   * Update a location
   */
  async update(tenantId: string, id: string, dto: UpdateLocationDto) {
    // Check location exists
    const existing = await this.prisma.location.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        code: true,
        email: true,
        phone: true,
        address: { select: { id: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Location not found.');
    }

    // Check code uniqueness if changing
    if (dto.code && dto.code !== existing.code) {
      const existingCode = await this.prisma.location.findFirst({
        where: {
          code: dto.code,
          tenantId,
          id: { not: id },
        },
        select: { id: true },
      });

      if (existingCode) {
        throw new ConflictException(
          'A location with this code already exists.',
        );
      }
    }

    // Check email uniqueness if changing
    if (dto.email && dto.email !== existing.email) {
      const existingEmail = await this.prisma.location.findFirst({
        where: {
          email: dto.email,
          id: { not: id },
        },
        select: { id: true },
      });

      if (existingEmail) {
        throw new ConflictException(
          'A location with this email already exists.',
        );
      }
    }

    // Check phone uniqueness if changing
    if (dto.phone && dto.phone !== existing.phone) {
      const existingPhone = await this.prisma.location.findFirst({
        where: {
          phone: dto.phone,
          id: { not: id },
        },
        select: { id: true },
      });

      if (existingPhone) {
        throw new ConflictException(
          'A location with this phone already exists.',
        );
      }
    }

    // Build update data
    const updateData: Prisma.LocationUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.subType !== undefined) updateData.subType = dto.subType;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.businessHours !== undefined)
      updateData.businessHours = dto.businessHours;
    if (dto.totalCapacity !== undefined)
      updateData.totalCapacity = dto.totalCapacity;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.establishedYear !== undefined)
      updateData.establishedYear = new Date(dto.establishedYear);

    // Handle address updates
    if (dto.address !== undefined) {
      if (dto.address === null) {
        // Delete existing address if set to null
        if (existing.address) {
          await this.prisma.address.delete({
            where: { id: existing.address.id },
          });
        }
      } else if (existing.address) {
        // Update existing address
        updateData.address = {
          update: {
            addressLine1: dto.address.addressLine1,
            addressLine2: dto.address.addressLine2,
            city: dto.address.city,
            state: dto.address.state,
            postalCode: dto.address.postalCode,
            country: dto.address.country,
            latitude: dto.address.latitude,
            longitude: dto.address.longitude,
            googleMapUrl: dto.address.googleMapUrl,
          },
        };
      } else {
        // Create new address
        updateData.address = {
          create: {
            addressLine1: dto.address.addressLine1,
            addressLine2: dto.address.addressLine2,
            city: dto.address.city,
            state: dto.address.state,
            postalCode: dto.address.postalCode,
            country: dto.address.country,
            latitude: dto.address.latitude,
            longitude: dto.address.longitude,
            googleMapUrl: dto.address.googleMapUrl,
          },
        };
      }
    }

    // Update location
    const location = await this.prisma.location.update({
      where: { id },
      data: updateData,
      include: {
        address: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return this.formatLocationResponse(location);
  }

  /**
   * Delete a location
   */
  async remove(tenantId: string, id: string): Promise<void> {
    const location = await this.prisma.location.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        _count: {
          select: {
            inventoryBalances: true,
            stockMovements: true,
            stockReservations: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found.');
    }

    // Check for stock relations
    const hasStockData =
      location._count.inventoryBalances > 0 ||
      location._count.stockMovements > 0 ||
      location._count.stockReservations > 0;

    if (hasStockData) {
      throw new ConflictException(
        'Cannot delete location with existing stock data. Move or delete stock first.',
      );
    }

    // Delete location (cascade will delete address)
    await this.prisma.location.delete({
      where: { id },
    });
  }

  /**
   * Build filter for location queries
   */
  private buildLocationFilter(
    tenantId: string,
    filterParams: Record<string, unknown>,
  ): Prisma.LocationWhereInput {
    const where: Prisma.LocationWhereInput = {
      tenantId,
    };

    // Status filter
    if (filterParams.status) {
      where.status = filterParams.status as Prisma.EnumLocationStatusFilter;
    }

    // Type filter
    if (filterParams.type) {
      where.type = filterParams.type as Prisma.EnumLocationTypeFilter;
    }

    // Sub-type filter
    if (filterParams.subType) {
      where.subType = filterParams.subType as Prisma.EnumLocationSubTypeFilter;
    }

    // Search filter (from base PaginationQueryDto)
    if (filterParams.search) {
      const searchTerm = filterParams.search as string;
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Format location response with computed name field for createdBy
   */
  private formatLocationResponse(
    location: {
      createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
      } | null;
    } & Record<string, unknown>,
  ) {
    if (location.createdBy) {
      return {
        ...location,
        createdBy: {
          id: location.createdBy.id,
          name: `${location.createdBy.firstName} ${location.createdBy.lastName}`.trim(),
          email: location.createdBy.email,
        },
      };
    }
    return location;
  }
}
