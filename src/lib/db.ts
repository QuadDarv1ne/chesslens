import { PrismaClient } from '@prisma/client'

// Ленивый синглтон PrismaClient.
// Клиент создаётся только при первом реальном обращении, чтобы деплой
// не падал, если DATABASE_URL не задан (движок анализа работает без БД).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
    })
  }
  return globalForPrisma.prisma
}

// Обратная совместимость со старым импортом `db`.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getDb()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma ??= getDb()
