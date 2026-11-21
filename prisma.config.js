import { defineConfig } from 'prisma/config';
import './server/src/config/environment.js';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'node prisma/seed.js' }
});
