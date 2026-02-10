import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleService } from './services/role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateUserAssignmentDto } from './dto/create-user-assignment.dto';
import { RemoveUserAssignmentDto } from './dto/remove-user-assignment.dto';
import { AuthenticatedGuard } from '@/modules/auth/guards/authenticated.guard';
import { AccessControlGuard } from './access-control.guard';
import { RequirePermission } from './decorator/permission.decorator';
import { RoleEntity, UserAssignmentEntity } from './entity';
import { TenantId } from '@/common/decorator/tenant-id.decorator';
import { CurrentUserId } from '@/common/decorator/current-user-id.decorator';
import {
  ApiCreate,
  ApiGetAll,
  ApiGetOne,
  ApiUpdate,
  ApiDelete,
} from '@/common/decorator/api';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiCreate('Create a new role', {
    type: RoleEntity,
    additionalResponses: [{ status: 409, description: 'Role name conflict' }],
  })
  @Post()
  @RequirePermission('Role', 'role.create')
  @HttpCode(HttpStatus.CREATED)
  create(@TenantId() tenantId: string, @Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto, tenantId);
  }

  @ApiGetAll('Get all roles of a tenant', { type: RoleEntity })
  @Get()
  @RequirePermission('Role', 'role.view')
  @HttpCode(HttpStatus.OK)
  findAll(@TenantId() tenantId: string) {
    return this.roleService.findAll(tenantId);
  }

  @ApiGetOne('Get a role by ID', { type: RoleEntity })
  @Get(':id')
  @RequirePermission('Role', 'role.view')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.roleService.findOne(id, tenantId);
  }

  @ApiUpdate('Update a role by ID', { type: RoleEntity })
  @Patch(':id')
  @RequirePermission('Role', 'role.update')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(id, tenantId, updateRoleDto);
  }

  @ApiCreate('Assign a user to a role at a location', {
    type: UserAssignmentEntity,
    additionalResponses: [
      { status: 409, description: 'User already assigned to this role' },
    ],
  })
  @Post('/assignments')
  @RequirePermission('Role', 'role.assign')
  @HttpCode(HttpStatus.CREATED)
  async assignUser(
    @TenantId() tenantId: string,
    @CurrentUserId() currentUserId: string,
    @Body() createUserAssignmentDto: CreateUserAssignmentDto,
  ) {
    return this.roleService.assignUser(
      tenantId,
      createUserAssignmentDto.roleId,
      createUserAssignmentDto.userId,
      createUserAssignmentDto.accessScope,
      createUserAssignmentDto.locationId,
      currentUserId,
    );
  }

  @ApiDelete('Remove a user assignment from a role')
  @Delete('/remove-assignment')
  @RequirePermission('Role', 'role.unassign')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAssignment(
    @TenantId() tenantId: string,
    @Body() removeUserAssignmentDto: RemoveUserAssignmentDto,
  ) {
    await this.roleService.removeUserAssignment(
      removeUserAssignmentDto.roleId,
      removeUserAssignmentDto.userId,
      tenantId,
      removeUserAssignmentDto.locationId,
    );
  }

  @ApiDelete('Delete a role by ID')
  @Delete(':id')
  @RequirePermission('Role', 'role.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.roleService.remove(id, tenantId);
  }
}
