import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create a custom database URL that disables prepared statements
const createDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return baseUrl;
  
  // Add parameters to disable prepared statements and optimize for pooler
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}prepare=false&connection_limit=1&pool_timeout=10`;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: createDatabaseUrl(),
    },
  },
  // Configure for Supabase transaction pooler
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Add connection timeout configuration
  transactionOptions: {
    timeout: 10000,
    maxWait: 5000,
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
