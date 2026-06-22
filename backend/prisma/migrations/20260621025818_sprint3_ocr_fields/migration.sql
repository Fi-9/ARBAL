-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "ocrConfidence" DOUBLE PRECISION,
ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING';
