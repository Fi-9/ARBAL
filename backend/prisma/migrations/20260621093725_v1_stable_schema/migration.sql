-- Drop existing types/tables if they were partially created in the previous failed run
DROP TYPE IF EXISTS "ParentStatus" CASCADE;
DROP TYPE IF EXISTS "JenisKelamin" CASCADE;
DROP TABLE IF EXISTS "SystemSetting" CASCADE;

-- CreateEnum
CREATE TYPE "ParentStatus" AS ENUM ('MASIH_HIDUP', 'MENINGGAL');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- AlterEnum conditionally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'DocumentType' AND e.enumlabel = 'SKL'
  ) THEN
    ALTER TYPE "DocumentType" ADD VALUE 'SKL';
  END IF;
END
$$;

-- AlterTable with IF NOT EXISTS guards
ALTER TABLE "Guardian" 
ADD COLUMN IF NOT EXISTS "alamatWali" TEXT,
ADD COLUMN IF NOT EXISTS "hubunganWali" TEXT,
ADD COLUMN IF NOT EXISTS "namaWali" TEXT,
ADD COLUMN IF NOT EXISTS "pendidikanAyah" TEXT,
ADD COLUMN IF NOT EXISTS "pendidikanIbu" TEXT,
ADD COLUMN IF NOT EXISTS "statusAyah" "ParentStatus" NOT NULL DEFAULT 'MASIH_HIDUP',
ADD COLUMN IF NOT EXISTS "statusIbu" "ParentStatus" NOT NULL DEFAULT 'MASIH_HIDUP',
ADD COLUMN IF NOT EXISTS "teleponWali" TEXT;

-- AlterTable with IF NOT EXISTS guards
ALTER TABLE "Student" 
ADD COLUMN IF NOT EXISTS "anakKe" INTEGER,
ADD COLUMN IF NOT EXISTS "asalSekolah" TEXT,
ADD COLUMN IF NOT EXISTS "jenisKelamin" "JenisKelamin",
ADD COLUMN IF NOT EXISTS "jumlahSaudara" INTEGER,
ADD COLUMN IF NOT EXISTS "namaPanggilan" TEXT,
ADD COLUMN IF NOT EXISTS "nik" TEXT,
ADD COLUMN IF NOT EXISTS "nomorKK" TEXT,
ADD COLUMN IF NOT EXISTS "photoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "tahunLulusSebelumnya" INTEGER,
ADD COLUMN IF NOT EXISTS "tempatLahir" TEXT;

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- --- CUSTOM DATA CONVERSION & ENUM CLEANUP ---

-- 1. Rename existing StudentStatus enum
ALTER TYPE "StudentStatus" RENAME TO "StudentStatus_old";

-- 2. Create new StudentStatus enum
CREATE TYPE "StudentStatus" AS ENUM ('PENDAFTAR', 'AKTIF', 'CUTI', 'LULUS', 'KELUAR', 'ALUMNI');

-- 3. Alter columns using StudentStatus with casting/mapping
ALTER TABLE "Student" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Student" ALTER COLUMN "status" TYPE "StudentStatus" USING (
  CASE 
    WHEN "status"::text = 'PINDAHAN' THEN 'KELUAR'::"StudentStatus"
    WHEN "status"::text = 'NON_AKTIF' THEN 'CUTI'::"StudentStatus"
    ELSE "status"::text::"StudentStatus"
  END
);
ALTER TABLE "Student" ALTER COLUMN "status" SET DEFAULT 'AKTIF';

ALTER TABLE "StudentStatusHistory" ALTER COLUMN "status" TYPE "StudentStatus" USING (
  CASE 
    WHEN "status"::text = 'PINDAHAN' THEN 'KELUAR'::"StudentStatus"
    WHEN "status"::text = 'NON_AKTIF' THEN 'CUTI'::"StudentStatus"
    ELSE "status"::text::"StudentStatus"
  END
);

-- 4. Drop the old StudentStatus enum type
DROP TYPE "StudentStatus_old";


-- 5. Rename existing DocumentStatus enum
ALTER TYPE "DocumentStatus" RENAME TO "DocumentStatus_old";

-- 6. Create new DocumentStatus enum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'VERIFIED', 'REJECTED');

-- 7. Alter columns using DocumentStatus with casting/mapping
ALTER TABLE "Document" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "status" TYPE "DocumentStatus" USING (
  CASE 
    WHEN "status"::text = 'VERIFIKASI' THEN 'UPLOADED'::"DocumentStatus"
    WHEN "status"::text = 'TERARSIP' THEN 'VERIFIED'::"DocumentStatus"
    WHEN "status"::text = 'DITOLAK' THEN 'REJECTED'::"DocumentStatus"
    ELSE "status"::text::"DocumentStatus"
  END
);
ALTER TABLE "Document" ALTER COLUMN "status" SET DEFAULT 'UPLOADED';

-- 8. Drop the old DocumentStatus enum type
DROP TYPE "DocumentStatus_old";
