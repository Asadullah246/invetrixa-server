import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MODULESREF } from './data/moduleAndDefaultPermittions.data';

/**
 * Automatically syncs ModuleRef definitions from code to database on application startup.
 * This ensures all modules exist before any tenant operations are performed.
 */
@Injectable()
export class ModuleSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ModuleSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.syncModules();
  }

  /**
   * Syncs all modules from MODULESREF to the database.
   * Creates missing modules and updates existing ones with new actions.
   */
  private async syncModules(): Promise<void> {
    this.logger.log('🔄 Syncing ModuleRef definitions...');

    try {
      await this.prisma.$transaction(async (tx) => {
        let created = 0;
        let updated = 0;

        for (const moduleData of MODULESREF) {
          const existing = await tx.moduleRef.findUnique({
            where: { name: moduleData.name },
          });

          if (existing) {
            // Check if actions have changed
            const actionsChanged =
              JSON.stringify(existing.actions.sort()) !==
              JSON.stringify([...moduleData.actions].sort());

            if (
              actionsChanged ||
              existing.description !== moduleData.description
            ) {
              await tx.moduleRef.update({
                where: { name: moduleData.name },
                data: {
                  description: moduleData.description,
                  actions: moduleData.actions,
                },
              });
              updated++;
            }
          } else {
            await tx.moduleRef.create({
              data: {
                name: moduleData.name,
                description: moduleData.description,
                actions: moduleData.actions,
              },
            });
            created++;
          }
        }

        if (created > 0 || updated > 0) {
          this.logger.log(
            `✅ ModuleRef sync: ${created} created, ${updated} updated`,
          );
        } else {
          this.logger.debug('✅ ModuleRef sync: All modules up to date');
        }
      });
    } catch (error) {
      this.logger.error('❌ Failed to sync modules:', error);
      throw error; // Fail fast - modules are required
    }
  }
}
