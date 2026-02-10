import { forwardRef, Module } from '@nestjs/common';
import { ModulesDefinitionService } from './modules-definition.service';
import { ModulesDefinitionController } from './modules-definition.controller';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ModuleSeedService } from './module-seed.service';

@Module({
  imports: [
    forwardRef(() => AccessControlModule),
    forwardRef(() => AuthModule),
  ],
  providers: [ModulesDefinitionService, ModuleSeedService],
  controllers: [ModulesDefinitionController],
  exports: [ModulesDefinitionService],
})
export class ModulesDefinitionModule {}
