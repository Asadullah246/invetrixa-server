import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto, PermissionUpdateDto } from '../dto/update-role.dto';
import { AccessScope } from '../entity/user-assignment.entity';
import {
  isProtectedRole,
  SUPER_ADMIN_ROLE,
} from '@/common/constants/system-roles.constants';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate permissions against the database's moduleRef.actions
   * Throws BadRequestException if any actions are invalid
   */
  private async validatePermissions(
    permissions: PermissionUpdateDto[],
  ): Promise<void> {
    // Fetch all modules by their IDs including their valid actions
    const moduleIds = permissions.map((p) => p.moduleRefId);
    const modules = await this.prisma.moduleRef.findMany({
      where: { id: { in: moduleIds } },
      select: { id: true, name: true, actions: true },
    });

    // Create a map of moduleId -> { name, actions }
    const moduleMap = new Map<string, { name: string; actions: string[] }>();
    for (const module of modules) {
      moduleMap.set(module.id, { name: module.name, actions: module.actions });
    }

    // Validate each permission
    const errors: string[] = [];
    for (const permission of permissions) {
      const module = moduleMap.get(permission.moduleRefId);

      if (!module) {
        errors.push(`Module with ID "${permission.moduleRefId}" not found`);
        continue;
      }

      // Find invalid actions (actions not in the module's valid actions list)
      const invalidActions = permission.actions.filter(
        (action) => !module.actions.includes(action),
      );

      if (invalidActions.length > 0) {
        errors.push(
          `Invalid actions for module "${module.name}": ${invalidActions.join(', ')}.`,
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  async create(createRoleDto: CreateRoleDto, tenantId: string) {
    // Check if role with same name exists in this tenant
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: createRoleDto.name,
        tenantId,
      },
    });

    if (existingRole) {
      throw new ConflictException(
        'Role with this name already exists in this tenant',
      );
    }

    const { permissions, ...roleData } = createRoleDto;

    // Validate actions before creating
    if (permissions && permissions.length > 0) {
      await this.validatePermissions(permissions);
    }

    // Use transaction for atomic create of role and permissions
    return await this.prisma.$transaction(async (tx) => {
      // Create the role
      const role = await tx.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          tenantId,
        },
      });

      // Create permissions if provided
      if (permissions && permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: role.id,
            moduleRefId: p.moduleRefId,
            actions: p.actions,
          })),
        });
      }

      // Return role with permissions
      return await tx.role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            select: {
              actions: true,
              moduleRef: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async findAll(tenantId: string) {
    return await this.prisma.role.findMany({
      where: { tenantId },
      include: {
        rolePermissions: {
          select: {
            actions: true,
            moduleRef: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          select: {
            actions: true,
            moduleRef: {
              select: {
                name: true,
              },
            },
          },
        },
        // userAssignments: {
        //   select: {
        //     id: true,
        //     accessScope: true,
        //     user: {
        //       select: {
        //         id: true,
        //         firstName: true,
        //         lastName: true,
        //       },
        //     },
        //     location: {
        //       select: {
        //         id: true,
        //         name: true,
        //       },
        //     },
        //   },
        // },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    if (role.tenantId !== tenantId) {
      throw new NotFoundException(`Role not found in your tenant`);
    }

    return role;
  }

  async update(id: string, tenantId: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id, tenantId);

    // Protect SuperAdmin role
    if (isProtectedRole(role.name)) {
      // Cannot rename protected roles
      if (updateRoleDto.name && updateRoleDto.name !== role.name) {
        throw new ForbiddenException(
          `Cannot rename the ${SUPER_ADMIN_ROLE} role`,
        );
      }
      // Cannot modify permissions of protected roles
      if (updateRoleDto.permissions !== undefined) {
        throw new ForbiddenException(
          `Cannot modify permissions of the ${SUPER_ADMIN_ROLE} role`,
        );
      }
    }

    const { permissions, ...roleData } = updateRoleDto;

    // Validate actions before updating
    if (permissions && permissions.length > 0) {
      await this.validatePermissions(permissions);
    }

    // Use transaction for atomic update of role and permissions
    return await this.prisma.$transaction(async (tx) => {
      // Update role basic fields
      await tx.role.update({
        where: { id },
        data: {
          name: roleData.name ?? role.name,
          description: roleData.description ?? role.description,
        },
      });

      // If permissions provided, replace all existing permissions
      if (permissions !== undefined) {
        // Delete existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Create new permissions if any
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({
              roleId: id,
              moduleRefId: p.moduleRefId,
              actions: p.actions,
            })),
          });
        }
      }

      // Return updated role with permissions
      return await tx.role.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            select: {
              actions: true,
              moduleRef: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async remove(id: string, tenantId: string) {
    const role = await this.findOne(id, tenantId);

    // Protect SuperAdmin role from deletion
    if (isProtectedRole(role.name)) {
      throw new ForbiddenException(
        `Cannot delete the ${SUPER_ADMIN_ROLE} role`,
      );
    }

    return await this.prisma.role.delete({
      where: { id },
    });
  }

  async assignUser(
    tenantId: string,
    roleId: string,
    userId: string,
    accessScope: AccessScope,
    locationId?: string,
    assignedById?: string,
  ) {
    // Validate role exists and belongs to tenant
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.tenantId !== tenantId) {
      throw new NotFoundException('Role not found in this tenant');
    }

    // Validate user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate accessScope and locationId combination
    if (accessScope === AccessScope.LOCATION && !locationId) {
      throw new BadRequestException(
        'Location ID is required when access scope is LOCATION',
      );
    }

    if (accessScope === AccessScope.TENANT && locationId) {
      throw new BadRequestException(
        'Location ID should not be provided when access scope is TENANT',
      );
    }

    // Validate location exists if provided
    if (locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
      });
      if (!location) {
        throw new NotFoundException('Location not found');
      }
      // TODO: Add location.tenantId !== tenantId check when Location model has tenantId
    }

    try {
      return await this.prisma.userAssignment.create({
        data: {
          roleId,
          tenantId,
          userId,
          accessScope,
          locationId: accessScope === AccessScope.LOCATION ? locationId : null,
          assignedById,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch {
      throw new ConflictException(
        'User already assigned to this role in this tenant/location',
      );
    }
  }

  async removeUserAssignment(
    roleId: string,
    userId: string,
    tenantId: string,
    locationId?: string,
  ) {
    // Check if this is a SuperAdmin role
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true },
    });

    if (role && isProtectedRole(role.name)) {
      // Count remaining SuperAdmin assignments in this tenant (excluding the one being removed)
      const remainingAssignments = await this.prisma.userAssignment.count({
        where: {
          roleId,
          tenantId,
          NOT: {
            userId,
          },
        },
      });

      if (remainingAssignments === 0) {
        throw new ForbiddenException(
          `Cannot remove the last ${SUPER_ADMIN_ROLE} from the tenant. Transfer ownership first.`,
        );
      }
    }

    const deleted = await this.prisma.userAssignment.deleteMany({
      where: {
        roleId,
        userId,
        tenantId,
        locationId: locationId ?? null,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Assignment not found');
    }

    return { success: true };
  }
}
