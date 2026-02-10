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
  Query,
} from '@nestjs/common';
import { LocationService } from './location.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  QueryLocationDto,
  LocationWithAddressResponseDto,
  LocationDetailResponseDto,
} from './dto';
import { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { RequirePermission } from '../access-control/decorator/permission.decorator';
import { TenantId } from '@/common/decorator/tenant-id.decorator';
import { CurrentUserId } from '@/common/decorator/current-user-id.decorator';
import {
  ApiCreate,
  ApiGetAll,
  ApiGetOne,
  ApiUpdate,
  ApiDelete,
} from '@/common/decorator/api';

@Controller('locations')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @ApiCreate('Create a new location', { type: LocationDetailResponseDto })
  @Post()
  @RequirePermission('Location', 'location.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() createLocationDto: CreateLocationDto,
  ) {
    return await this.locationService.create(
      tenantId,
      userId,
      createLocationDto,
    );
  }

  @ApiGetAll('Get all locations with filtering and pagination', {
    type: LocationWithAddressResponseDto,
  })
  @Get()
  @RequirePermission('Location', 'location.view')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: QueryLocationDto,
  ): Promise<PaginatedResponse<LocationWithAddressResponseDto>> {
    return await this.locationService.findAll(tenantId, query);
  }

  @ApiGetOne('Get a single location by ID', {
    type: LocationDetailResponseDto,
  })
  @Get(':id')
  @RequirePermission('Location', 'location.view')
  @HttpCode(HttpStatus.OK)
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return await this.locationService.findOne(tenantId, id);
  }

  @ApiUpdate('Update a location', {
    type: LocationDetailResponseDto,
    additionalResponses: [
      { status: 409, description: 'Location code already exists' },
    ],
  })
  @Patch(':id')
  @RequirePermission('Location', 'location.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return await this.locationService.update(tenantId, id, updateLocationDto);
  }

  @ApiDelete('Delete a location', {
    additionalResponses: [
      { status: 409, description: 'Location has existing stock data' },
    ],
  })
  @Delete(':id')
  @RequirePermission('Location', 'location.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.locationService.remove(tenantId, id);
  }
}
