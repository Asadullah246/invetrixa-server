import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Prisma } from 'generated/prisma/client';

// Return types using Prisma payloads
type ModuleRefWithActions = Prisma.ModuleRefGetPayload<{
  select: {
    id: true;
    name: true;
  };
}>;

@Injectable()
export class ModulesDefinitionService {
  constructor(private prisma: PrismaService) {}

  // ==================== MODULE METHODS ====================

  async getAllModules(): Promise<ModuleRefWithActions[]> {
    return await this.prisma.moduleRef.findMany({});
  }

  async getModuleById(id: string): Promise<ModuleRefWithActions> {
    const moduleRef = await this.prisma.moduleRef.findUnique({
      where: { id },
    });

    if (!moduleRef) {
      throw new NotFoundException(`Module with id "${id}" not found`);
    }

    return moduleRef;
  }
}
