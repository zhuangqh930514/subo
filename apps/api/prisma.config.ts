import 'dotenv/config';

import { defineConfig } from 'prisma/config';

const FALLBACK_DATABASE_URL = 'mysql://root:password@example.invalid:3306/subo_platform';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --project tsconfig.json prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? FALLBACK_DATABASE_URL,
  },
});
