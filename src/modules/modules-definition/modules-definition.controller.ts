import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ModulesDefinitionService } from './modules-definition.service';
import { RequirePermission } from '../access-control/decorator/permission.decorator';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';

@Controller('modules')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class ModulesDefinitionController {
  constructor(private readonly modulesService: ModulesDefinitionService) {}

  // ==================== MODULE ENDPOINTS ====================

  @Get()
  @RequirePermission('Module', 'module.view')
  async getAllModules() {
    return this.modulesService.getAllModules();
  }

  @Get('/:id')
  @RequirePermission('Module', 'module.view')
  async getModuleById(@Param('id') id: string) {
    return this.modulesService.getModuleById(id);
  }
}
