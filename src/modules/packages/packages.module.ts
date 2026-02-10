import { Module } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { ModulesDefinitionModule } from '../modules-definition/modules-definition.module';

@Module({
  imports: [ModulesDefinitionModule],
  providers: [PackagesService],
  controllers: [PackagesController],
  exports: [PackagesService],
})
export class PackagesModule {}
