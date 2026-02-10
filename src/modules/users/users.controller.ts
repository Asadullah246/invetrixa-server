import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  GetTenantUsersResponseDto,
  GetUserDetailsResponseDto,
  TenantUserFilterDto,
  UpdateMeDto,
  UserIdParams,
} from './dto';
import { UserEntity } from './dto/response/user.entity';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { RequirePermission } from '../access-control/decorator/permission.decorator';
import { TenantId } from '@/common/decorator/tenant-id.decorator';
import { CurrentUserId } from '@/common/decorator/current-user-id.decorator';
import { ApiGetAll, ApiGetOne, ApiUpdate } from '@/common/decorator/api';

@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiGetAll('Get all users in tenant', { type: GetTenantUsersResponseDto })
  @Get()
  @RequirePermission('User', 'user.view')
  @HttpCode(HttpStatus.OK)
  async getAllUsers(
    @TenantId() tenantId: string,
    @Query() queries: TenantUserFilterDto,
  ) {
    const data = await this.usersService.getAllUsers(queries, tenantId);

    return {
      message: 'Users retrieved successfully',
      ...data,
    };
  }

  @ApiGetOne('Get extended profile for current user', {
    type: GetUserDetailsResponseDto,
    description:
      'Retrieved current user with full details including roleAssignments, preferences, address, and trustedDevices',
  })
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUserId() userId: string, @TenantId() tenantId: string) {
    const data = await this.usersService.getMe(userId, tenantId);

    return {
      message: 'User profile retrieved successfully',
      data,
    };
  }

  @ApiGetOne('Get user details', { type: GetUserDetailsResponseDto })
  @Get(':id')
  @RequirePermission('User', 'user.view')
  @HttpCode(HttpStatus.OK)
  async getUserById(
    @TenantId() tenantId: string,
    @Param() params: UserIdParams,
  ) {
    const data = await this.usersService.getUser(params.id, tenantId);

    return {
      message: 'User retrieved successfully',
      data,
    };
  }

  @ApiUpdate('Update current user profile', { type: UserEntity })
  @Patch('/update-me')
  @HttpCode(HttpStatus.OK)
  async updateMe(@CurrentUserId() userId: string, @Body() body: UpdateMeDto) {
    const data = await this.usersService.updateMe(userId, body);

    return {
      message: 'Profile updated successfully',
      data,
    };
  }
}
