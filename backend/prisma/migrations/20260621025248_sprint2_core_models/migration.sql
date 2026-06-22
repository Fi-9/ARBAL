-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('INTERNAL', 'PUBLIC');

-- CreateTable
CREATE TABLE "StudentTimeline" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentStatusHistory" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "StudentStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentNote" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'INTERNAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentTimeline_studentId_idx" ON "StudentTimeline"("studentId");

-- CreateIndex
CREATE INDEX "StudentTimeline_createdAt_idx" ON "StudentTimeline"("createdAt");

-- CreateIndex
CREATE INDEX "StudentStatusHistory_studentId_idx" ON "StudentStatusHistory"("studentId");

-- CreateIndex
CREATE INDEX "StudentStatusHistory_changedById_idx" ON "StudentStatusHistory"("changedById");

-- CreateIndex
CREATE INDEX "StudentNote_studentId_idx" ON "StudentNote"("studentId");

-- CreateIndex
CREATE INDEX "StudentNote_authorId_idx" ON "StudentNote"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequirement_type_key" ON "DocumentRequirement"("type");

-- AddForeignKey
ALTER TABLE "StudentTimeline" ADD CONSTRAINT "StudentTimeline_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStatusHistory" ADD CONSTRAINT "StudentStatusHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStatusHistory" ADD CONSTRAINT "StudentStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
