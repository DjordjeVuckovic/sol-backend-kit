import { env } from "./env.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma-client/client.js";

const adapter = new PrismaPg({connectionString: env.DATABASE_URL});
const prisma = new PrismaClient({adapter})

export { prisma };