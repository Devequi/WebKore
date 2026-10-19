import { defineConfig } from 'prisma/config';
import './server/src/lib/environment.js';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'node prisma/seed.js' }
});
