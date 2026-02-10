import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  Prisma,
  POSSessionStatus,
  PaymentMethod,
} from 'generated/prisma/client';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import {
  OpenSessionDto,
  CloseSessionDto,
  QuerySessionDto,
  SessionResponseDto,
  SessionDetailResponseDto,
} from '../dto';

// Type for session with includes
type SessionWithIncludes = Prisma.POSSessionGetPayload<{
  include: {
    terminal: { select: { id: true; name: true; code: true } };
    openedBy: { select: { id: true; firstName: true; lastName: true } };
    closedBy: { select: { id: true; firstName: true; lastName: true } };
  };
}>;

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    terminal: { select: { id: true, name: true, code: true } },
    openedBy: { select: { id: true, firstName: true, lastName: true } },
    closedBy: { select: { id: true, firstName: true, lastName: true } },
  };

  /**
   * Format session for list response
   */
  private formatListResponse(session: SessionWithIncludes): SessionResponseDto {
    return {
      id: session.id,
      sessionNumber: session.sessionNumber,
      openingBalance: session.openingBalance.toFixed(4),
      closingBalance: session.closingBalance?.toFixed(4) ?? null,
      expectedBalance: session.expectedBalance?.toFixed(4) ?? null,
      variance: session.variance?.toFixed(4) ?? null,
      status: session.status,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      terminalName: session.terminal.name,
      openedBy: `${session.openedBy.firstName} ${session.openedBy.lastName}`,
      closedBy: session.closedBy
        ? `${session.closedBy.firstName} ${session.closedBy.lastName}`
        : null,
    };
  }

  /**
   * Generate session number (SES-YYYY-NNNNN)
   */
  private async generateSessionNumber(
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const prismaClient = tx ?? this.prisma;
    const year = new Date().getFullYear();
    const prefix = `SES-${year}-`;

    // Get the latest session number for this tenant and year
    const latest = await prismaClient.pOSSession.findFirst({
      where: {
        tenantId,
        sessionNumber: { startsWith: prefix },
      },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true },
    });

    let nextNumber = 1;
    if (latest) {
      const numPart = latest.sessionNumber.replace(prefix, '');
      nextNumber = parseInt(numPart, 10) + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  /**
   * Open a new session
   */
  async open(
    tenantId: string,
    userId: string,
    dto: OpenSessionDto,
  ): Promise<{ message: string; data: SessionResponseDto }> {
    // Validate terminal exists and belongs to tenant
    const terminal = await this.prisma.pOSTerminal.findFirst({
      where: { id: dto.terminalId, tenantId, isActive: true, deletedAt: null },
    });
    if (!terminal) {
      throw new NotFoundException('Terminal not found or inactive');
    }

    // Check if there's already an open session on this terminal
    const existingSession = await this.prisma.pOSSession.findFirst({
      where: { terminalId: dto.terminalId, status: POSSessionStatus.OPEN },
    });
    if (existingSession) {
      throw new ConflictException(
        `Terminal already has an open session (${existingSession.sessionNumber}). Close it first.`,
      );
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const sessionNumber = await this.generateSessionNumber(tenantId, tx);

      return tx.pOSSession.create({
        data: {
          sessionNumber,
          openingBalance: new Prisma.Decimal(dto.openingBalance),
          status: POSSessionStatus.OPEN,
          openingCount: dto.openingCount,
          notes: dto.notes,
          terminalId: dto.terminalId,
          openedById: userId,
          tenantId,
        },
        include: this.includeRelations,
      });
    });

    return {
      message: 'Session opened successfully',
      data: this.formatListResponse(session),
    };
  }

  /**
   * Close a session with reconciliation
   */
  async close(
    tenantId: string,
    userId: string,
    sessionId: string,
    dto: CloseSessionDto,
  ): Promise<{ message: string; data: SessionDetailResponseDto }> {
    const session = await this.prisma.pOSSession.findFirst({
      where: { id: sessionId, tenantId },
      include: this.includeRelations,
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== POSSessionStatus.OPEN) {
      throw new BadRequestException(
        `Cannot close ${session.status.toLowerCase()} session`,
      );
    }

    // Calculate expected balance from cash payments during this session
    const cashPayments = await this.prisma.salePayment.aggregate({
      where: {
        sale: { sessionId, status: 'COMPLETED' },
        method: PaymentMethod.CASH,
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    const cashReceived = cashPayments._sum.amount ?? new Prisma.Decimal(0);
    const expectedBalance = session.openingBalance.add(cashReceived);
    const actualClosing = new Prisma.Decimal(dto.closingBalance);
    const variance = actualClosing.sub(expectedBalance);

    const updated = await this.prisma.pOSSession.update({
      where: { id: sessionId },
      data: {
        status: POSSessionStatus.CLOSED,
        closingBalance: actualClosing,
        expectedBalance,
        variance,
        closingCount: dto.closingCount,
        notes: dto.notes
          ? `${session.notes ?? ''}\n${dto.notes}`.trim()
          : session.notes,
        closedAt: new Date(),
        closedById: userId,
      },
      include: this.includeRelations,
    });

    // Get sales count for this session
    const salesCount = await this.prisma.sale.count({
      where: { sessionId, status: 'COMPLETED' },
    });

    return {
      message: 'Session closed successfully',
      data: this.formatDetailResponse(
        updated,
        salesCount,
        cashReceived.toFixed(4),
      ),
    };
  }

  /**
   * Get all sessions with pagination and filters
   */
  async findAll(
    tenantId: string,
    query: QuerySessionDto,
  ): Promise<{
    data: SessionResponseDto[];
    meta: ReturnType<typeof generatePaginationMeta>;
  }> {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);
    const where = this.buildFilter(tenantId, filterParams);

    const [data, total] = await Promise.all([
      this.prisma.pOSSession.findMany({
        where,
        ...paginationPrismaQuery,
        orderBy: { openedAt: 'desc' },
        include: this.includeRelations,
      }),
      this.prisma.pOSSession.count({ where }),
    ]);

    return {
      meta: generatePaginationMeta({ ...paginationData, total }),
      data: data.map((s) => this.formatListResponse(s)),
    };
  }

  /**
   * Get a single session by ID
   */
  async findOne(
    tenantId: string,
    id: string,
  ): Promise<SessionDetailResponseDto> {
    const session = await this.prisma.pOSSession.findFirst({
      where: { id, tenantId },
      include: this.includeRelations,
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Get sales statistics for this session
    const salesCount = await this.prisma.sale.count({
      where: { sessionId: id, status: 'COMPLETED' },
    });

    const cashPayments = await this.prisma.salePayment.aggregate({
      where: {
        sale: { sessionId: id, status: 'COMPLETED' },
        method: PaymentMethod.CASH,
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    const cashReceived = cashPayments._sum.amount ?? new Prisma.Decimal(0);

    return this.formatDetailResponse(
      session,
      salesCount,
      cashReceived.toFixed(4),
    );
  }

  /**
   * Get current open session for a terminal (if any)
   */
  async getOpenSession(
    tenantId: string,
    terminalId: string,
  ): Promise<SessionResponseDto | null> {
    const session = await this.prisma.pOSSession.findFirst({
      where: { terminalId, tenantId, status: POSSessionStatus.OPEN },
      include: this.includeRelations,
    });

    return session ? this.formatListResponse(session) : null;
  }

  /**
   * Format session for detailed response
   */
  private formatDetailResponse(
    session: SessionWithIncludes,
    totalSales: number,
    totalCashReceived: string,
  ): SessionDetailResponseDto {
    return {
      id: session.id,
      sessionNumber: session.sessionNumber,
      openingBalance: session.openingBalance.toFixed(4),
      closingBalance: session.closingBalance?.toFixed(4) ?? null,
      expectedBalance: session.expectedBalance?.toFixed(4) ?? null,
      variance: session.variance?.toFixed(4) ?? null,
      status: session.status,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingCount: session.openingCount as Record<string, number> | null,
      closingCount: session.closingCount as Record<string, number> | null,
      notes: session.notes,
      terminal: {
        id: session.terminal.id,
        name: session.terminal.name,
        code: session.terminal.code,
      },
      openedByUser: {
        id: session.openedBy.id,
        name: `${session.openedBy.firstName} ${session.openedBy.lastName}`,
      },
      closedByUser: session.closedBy
        ? {
            id: session.closedBy.id,
            name: `${session.closedBy.firstName} ${session.closedBy.lastName}`,
          }
        : null,
      totalSales,
      totalCashReceived,
    };
  }

  /**
   * Build filter for session queries
   */
  private buildFilter(
    tenantId: string,
    filterParams: Partial<QuerySessionDto>,
  ): Prisma.POSSessionWhereInput {
    const conditions: Prisma.POSSessionWhereInput[] = [{ tenantId }];

    if (filterParams.terminalId) {
      conditions.push({ terminalId: filterParams.terminalId });
    }

    if (filterParams.status) {
      conditions.push({ status: filterParams.status });
    }

    // Date range filter
    if (filterParams.dateFrom || filterParams.dateTo) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (filterParams.dateFrom) {
        dateFilter.gte = new Date(filterParams.dateFrom);
      }
      if (filterParams.dateTo) {
        dateFilter.lte = new Date(filterParams.dateTo);
      }
      conditions.push({ openedAt: dateFilter });
    }

    return { AND: conditions };
  }
}
