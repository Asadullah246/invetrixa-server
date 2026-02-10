import {
  Controller,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { ApiGetAll, ApiGetOne, ApiDelete } from '@/common/decorator/api';

@ApiTags('Packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @ApiGetAll('Get all packages', { requiresAuth: false })
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllPackages() {
    return await this.packagesService.getAllPackages();
  }

  @ApiGetOne('Get a single package by ID', { requiresAuth: false })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPackage(@Param('id', ParseUUIDPipe) id: string) {
    return await this.packagesService.getPackageById(id);
  }

  @ApiDelete('Delete a package')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePackage(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.packagesService.deletePackage(id);
  }
}
