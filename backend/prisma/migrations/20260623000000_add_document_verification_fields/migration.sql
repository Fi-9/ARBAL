-- AlterTable
ALTER TABLE "Document" ADD COLUMN "verification_notes" TEXT,
ADD COLUMN "verified_by" TEXT,
ADD COLUMN "verified_at" TIMESTAMP(3);
