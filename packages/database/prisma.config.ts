import { defineConfig } from '@prisma/client'

export default defineConfig({
  databaseUrl: 'file:./prisma/dev.db',
})
