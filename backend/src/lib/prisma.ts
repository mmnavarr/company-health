import { PrismaBun } from "@onreza/prisma-adapter-bun";
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = process.env.POSTGRES_URL_NON_POOLING;
if (!connectionString) {
  throw new Error("POSTGRES_URL_NON_POOLING is not set");
}

const adapter = new PrismaBun({
  url: connectionString,
  tls: { rejectUnauthorized: false },
});
export const prisma = new PrismaClient({ adapter });
