import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AccessScope } from 'generated/prisma/enums';

@Injectable()
export class AccessControlService {
  constructor(private prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    resource: string, // Module name (e.g., "Product")
    action: string, // Action key (e.g., "product.create")
    tenantId: string,
    locationId?: string | null, // Optional location
  ): Promise<boolean> {
    // Fetch all assignments for this user in this tenant
    const assignments = await this.prisma.userAssignment.findMany({
      where: {
        userId,
        tenantId,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                moduleRef: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!assignments.length) return false;

    // Filter assignments based on accessScope and location:
    // - accessScope === TENANT => tenant-wide access (applies everywhere)
    // - accessScope === LOCATION && locationId matches => location-specific access
    const relevantAssignments = assignments.filter((a) => {
      // Tenant-wide access applies to all locations
      if (a.accessScope === AccessScope.TENANT) {
        return true;
      }
      // Location-specific access only applies if locationId matches
      if (a.accessScope === AccessScope.LOCATION) {
        return a.locationId === locationId;
      }
      return false;
    });

    if (!relevantAssignments.length) return false;

    // ✅ Normal permission check
    return relevantAssignments.some((assignment) =>
      assignment.role.rolePermissions.some((permission) => {
        if (!permission.moduleRef) return false;
        if (permission.moduleRef.name !== resource) return false;

        return permission.actions.includes(action);
      }),
    );
  }
}
