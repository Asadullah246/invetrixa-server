import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from 'generated/prisma/client';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import {
  CreateTerminalDto,
  UpdateTerminalDto,
  QueryTerminalDto,
  TerminalResponseDto,
  TerminalWithLocationResponseDto,
} from '../dto';

// Type for terminal with includes
type TerminalWithIncludes = Prisma.POSTerminalGetPayload<{
  include: {
    location: { select: { id: true; name: true; code: true } };
    createdBy: { select: { id: true; firstName: true; lastName: true } };
  };
}>;

@Injectable()
export class TerminalService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    location: { select: { id: true, name: true, code: true } },
    createdBy: { select: { id: true, firstName: true, lastName: true } },
  };

  /**
   * Format terminal for API response
   */
  private formatResponse(
    terminal: TerminalWithIncludes,
  ): TerminalWithLocationResponseDto {
    return {
      id: terminal.id,
      name: terminal.name,
      code: terminal.code,
      isActive: terminal.isActive,
      locationId: terminal.locationId,
      createdAt: terminal.createdAt,
      updatedAt: terminal.updatedAt,
      location: {
        id: terminal.location.id,
        name: terminal.location.name,
        code: terminal.location.code,
      },
      createdBy: terminal.createdBy
        ? {
            id: terminal.createdBy.id,
            name: `${terminal.createdBy.firstName} ${terminal.createdBy.lastName}`,
          }
        : null,
    };
  }

  /**
   * Create a new POS terminal
   */
  async create(
    tenantId: string,
    userId: string,
    dto: CreateTerminalDto,
  ): Promise<{ message: string; data: TerminalWithLocationResponseDto }> {
    // Validate location exists and belongs to tenant
    const location = await this.prisma.location.findFirst({
      where: { id: dto.locationId, tenantId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Check for duplicate code within tenant
    const existingCode = await this.prisma.pOSTerminal.findFirst({
      where: { code: dto.code, tenantId, deletedAt: null },
    });
    if (existingCode) {
      throw new ConflictException(
        `Terminal with code "${dto.code}" already exists`,
      );
    }

    const terminal = await this.prisma.pOSTerminal.create({
      data: {
        name: dto.name,
        code: dto.code,
        isActive: true,
        locationId: dto.locationId,
        tenantId,
        createdById: userId,
      },
      include: this.includeRelations,
    });

    return {
      message: 'Terminal created successfully',
      data: this.formatResponse(terminal),
    };
  }

  /**
   * Get all terminals with pagination and filters
   */
  async findAll(
    tenantId: string,
    query: QueryTerminalDto,
  ): Promise<{
    data: TerminalWithLocationResponseDto[];
    meta: ReturnType<typeof generatePaginationMeta>;
  }> {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);
    const where = this.buildFilter(tenantId, filterParams);

    const [data, total] = await Promise.all([
      this.prisma.pOSTerminal.findMany({
        where,
        ...paginationPrismaQuery,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations,
      }),
      this.prisma.pOSTerminal.count({ where }),
    ]);

    return {
      meta: generatePaginationMeta({ ...paginationData, total }),
      data: data.map((t) => this.formatResponse(t)),
    };
  }

  /**
   * Get a single terminal by ID
   */
  async findOne(
    tenantId: string,
    id: string,
  ): Promise<TerminalWithLocationResponseDto> {
    const terminal = await this.prisma.pOSTerminal.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: this.includeRelations,
    });

    if (!terminal) {
      throw new NotFoundException('Terminal not found');
    }

    return this.formatResponse(terminal);
  }

  /**
   * Update a terminal
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateTerminalDto,
  ): Promise<{ message: string; data: TerminalWithLocationResponseDto }> {
    // Verify terminal exists
    const existing = await this.prisma.pOSTerminal.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Terminal not found');
    }

    // If updating location, validate it exists
    if (dto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: dto.locationId, tenantId },
      });
      if (!location) {
        throw new NotFoundException('Location not found');
      }
    }

    // If updating code, check for duplicates
    if (dto.code && dto.code !== existing.code) {
      const duplicateCode = await this.prisma.pOSTerminal.findFirst({
        where: { code: dto.code, tenantId, deletedAt: null, NOT: { id } },
      });
      if (duplicateCode) {
        throw new ConflictException(
          `Terminal with code "${dto.code}" already exists`,
        );
      }
    }

    const terminal = await this.prisma.pOSTerminal.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code }),
        ...(dto.locationId && { locationId: dto.locationId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: this.includeRelations,
    });

    return {
      message: 'Terminal updated successfully',
      data: this.formatResponse(terminal),
    };
  }

  /**
   * Soft delete a terminal
   */
  async remove(tenantId: string, id: string): Promise<void> {
    const terminal = await this.prisma.pOSTerminal.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!terminal) {
      throw new NotFoundException('Terminal not found');
    }

    // Check for open sessions
    const openSession = await this.prisma.pOSSession.findFirst({
      where: { terminalId: id, status: 'OPEN' },
    });
    if (openSession) {
      throw new BadRequestException(
        'Cannot delete terminal with an open session. Close the session first.',
      );
    }

    await this.prisma.pOSTerminal.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  /**
   * Get active terminals for a location (for POS dropdown)
   */
  async getActiveByLocation(
    tenantId: string,
    locationId: string,
  ): Promise<TerminalResponseDto[]> {
    const terminals = await this.prisma.pOSTerminal.findMany({
      where: { tenantId, locationId, isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
    });

    return terminals.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      isActive: t.isActive,
      locationId: t.locationId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  /**
   * Build filter for terminal queries
   */
  private buildFilter(
    tenantId: string,
    filterParams: Partial<QueryTerminalDto>,
  ): Prisma.POSTerminalWhereInput {
    const conditions: Prisma.POSTerminalWhereInput[] = [
      { tenantId },
      { deletedAt: null },
    ];

    if (filterParams.locationId) {
      conditions.push({ locationId: filterParams.locationId });
    }

    if (filterParams.isActive !== undefined) {
      conditions.push({ isActive: filterParams.isActive });
    }

    // Search filter
    if (filterParams.search) {
      const term = filterParams.search.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { code: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    return { AND: conditions };
  }
}
