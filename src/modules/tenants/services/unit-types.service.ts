import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  UpsertUnitTypesDto,
  UnitTypesResponseDto,
} from '../dto/unit-types.dto';

@Injectable()
export class UnitTypesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get unit types for a tenant
   * Falls back to global defaults if tenant has no custom types
   */
  async getUnitTypes(tenantId: string): Promise<UnitTypesResponseDto> {
    // First try to get tenant-specific unit types
    const tenantTypes = await this.prisma.tenantUnitTypes.findUnique({
      where: { tenantId },
    });

    if (tenantTypes) {
      return {
        id: tenantTypes.id,
        values: tenantTypes.values,
        tenantId: tenantTypes.tenantId,
      };
    }

    // Fallback to global defaults (record with no tenantId)
    const globalTypes = await this.prisma.tenantUnitTypes.findFirst({
      where: { tenantId: null },
    });

    if (globalTypes) {
      return {
        id: globalTypes.id,
        values: globalTypes.values,
        tenantId: null,
      };
    }
    // return empty array
    return {
      id: '',
      values: [],
      tenantId: null,
    };
  }

  /**
   * Create or update unit types for a tenant
   */
  async upsertUnitTypes(
    tenantId: string,
    dto: UpsertUnitTypesDto,
  ): Promise<UnitTypesResponseDto> {
    const result = await this.prisma.tenantUnitTypes.upsert({
      where: { tenantId },
      create: {
        values: dto.values,
        tenantId,
      },
      update: {
        values: dto.values,
      },
    });

    return {
      id: result.id,
      values: result.values,
      tenantId: result.tenantId,
    };
  }

  /**
   * Add new unit types to existing list
   */
  async addUnitTypes(
    tenantId: string,
    newValues: string[],
  ): Promise<UnitTypesResponseDto> {
    const existing = await this.getUnitTypes(tenantId);
    const merged = [...new Set([...existing.values, ...newValues])];

    return this.upsertUnitTypes(tenantId, { values: merged });
  }

  /**
   * Remove unit types from list
   */
  async removeUnitTypes(
    tenantId: string,
    valuesToRemove: string[],
  ): Promise<UnitTypesResponseDto> {
    const existing = await this.getUnitTypes(tenantId);
    const filtered = existing.values.filter((v) => !valuesToRemove.includes(v));

    return this.upsertUnitTypes(tenantId, { values: filtered });
  }
}
