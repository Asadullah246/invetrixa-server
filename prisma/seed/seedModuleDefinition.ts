import { MODULESREF } from '@/modules/modules-definition/data/moduleAndDefaultPermittions.data';
import { PrismaClient } from 'generated/prisma/client';

export async function seedModules(prisma: PrismaClient) {
  console.log('🔄 Syncing ModuleRefs from static definitions...');

  const moduleNames = MODULESREF.map((m) => m.name);

  await prisma.$transaction(async (tx) => {
    let created = 0;
    let updated = 0;

    // ---------------------------------------------------------------------
    // 1. Upsert modules
    // ---------------------------------------------------------------------
    for (const moduleData of MODULESREF) {
      const existing = await tx.moduleRef.findUnique({
        where: { name: moduleData.name },
      });

      await tx.moduleRef.upsert({
        where: { name: moduleData.name },
        create: {
          name: moduleData.name,
          description: moduleData.description,
          actions: moduleData.actions,
        },
        update: {
          description: moduleData.description,
          actions: moduleData.actions,
        },
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    }

    // ---------------------------------------------------------------------
    // 2. Remove modules that no longer exist in code
    // ---------------------------------------------------------------------
    const removedModules = await tx.moduleRef.findMany({
      where: {
        name: { notIn: moduleNames },
      },
      select: { id: true, name: true },
    });

    if (removedModules.length > 0) {
      console.log(`🧹 Removing ${removedModules.length} obsolete modules...`);

      const removedIds = removedModules.map((m) => m.id);

      // Remove related permissions first
      await tx.rolePermission.deleteMany({
        where: {
          moduleRefId: { in: removedIds },
        },
      });

      // Remove modules
      await tx.moduleRef.deleteMany({
        where: {
          id: { in: removedIds },
        },
      });
    }

    console.log(
      `✨ ModuleRefs synced: ${created} created, ${updated} updated, ${removedModules.length} removed`,
    );
  });
}
