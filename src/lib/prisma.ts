import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const rawDatabaseUrl = process.env.DATABASE_URL;
const databaseUrl = (rawDatabaseUrl ?? "").trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaPg(
  {
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
  },
  {
    onPoolError: (err) => {
      console.error("PostgreSQL Pool Error:", err.message);
    },
  }
);

const prisma = new PrismaClient({ adapter });

export { prisma };
export default prisma;
