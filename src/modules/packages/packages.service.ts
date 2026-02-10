import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ModulesDefinitionService } from '../modules-definition/modules-definition.service';

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modulesService: ModulesDefinitionService,
  ) {}

  async getAllPackages() {
    // TODO : implement pagination, filtering and sorting
    return this.prisma.package.findMany({
      include: { features: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPackageById(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: { features: true },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  async deletePackage(id: string) {
    // Delete features first (cascade not required)
    await this.prisma.packageFeature.deleteMany({ where: { packageId: id } });

    await this.prisma.package.delete({ where: { id } });
    return true;
  }
}
