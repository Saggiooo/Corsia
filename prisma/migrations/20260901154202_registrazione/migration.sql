-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'approved';

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- L'indice trigram non e' esprimibile nello schema Prisma: si riafferma qui.
CREATE INDEX IF NOT EXISTS "Product_searchText_trgm_idx"
  ON "Product" USING GIN ("searchText" gin_trgm_ops);
