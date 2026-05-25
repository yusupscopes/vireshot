import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const globalForPrisma = globalThis as unknown as {
  __prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    adapter: new PrismaNeon({
      connectionString,
    }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;
