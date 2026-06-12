import { env } from "./env";
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url:
          env.DATABASE_URL ||
          (process.env.NEXT_PHASE === "phase-production-build"
            ? "postgresql://placeholder:placeholder@localhost:5432/placeholder"
            : "")
      }
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
