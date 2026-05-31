import { PrismaClient } from '@prisma/client';

import { createPrismaAdapter } from '../src/prisma/mariadb-adapter';

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
});

async function main() {
  const platforms = [
    { code: 'rjmart', name: '锐竟' },
    { code: 'casmart', name: '喀斯玛' },
    { code: 'other', name: '其他' },
  ];

  for (const platform of platforms) {
    await prisma.supplierPlatform.upsert({
      where: { code: platform.code },
      update: { name: platform.name },
      create: platform,
    });
  }
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
