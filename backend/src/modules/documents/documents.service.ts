import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentStatus, DocumentType, ReviewStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { extname } from 'path';
import { StorageProvider } from './storage/storage-provider.interface';
import { Readable } from 'stream';
import { DatabaseStorageProvider } from './storage/database-storage.provider';

/** Allowed MIME types and their expected magic byte signatures */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** Map file extensions to expected MIME types for independent validation */
const EXT_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** Magic byte signatures for file type detection */
const MAGIC_SIGNATURES: Array<{ bytes: number[]; mime: string }> = [
  { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },      // PNG
  { bytes: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' },            // JPEG
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' }, // PDF
];

/**
 * Detect MIME type from file buffer using magic bytes.
 * Returns null if no known signature matches.
 */
function detectMimeFromBuffer(buffer: Buffer): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    if (buffer.length >= sig.bytes.length) {
      const match = sig.bytes.every((byte, i) => buffer[i] === byte);
      if (match) return sig.mime;
    }
  }
  // WebP check (RIFF ... WEBP)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // "RIFF"
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50  // "WEBP"
  ) {
    return 'image/webp';
  }
  return null;
}

import { BackupService } from '../backup/backup.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    @Inject('StorageProvider') private storage: StorageProvider,
    private backupService: BackupService,
  ) {}

  /** Get all active documents for a given student */
  async findByStudent(studentId: string) {
    return this.prisma.document.findMany({
      where: { studentId, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /** Get a single document by ID */
  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.deletedAt) throw new NotFoundException('Document not found');
    return doc;
  }

  async scanUploadedFile(file: Express.Multer.File): Promise<boolean> {
    // Mock antivirus scan hook. Return true (clean) for now, easily pluggable in the future.
    return true;
  }

  private async logUploadFailure(studentId: string, uploadedById: string, reason: string, type: DocumentType) {
    try {
      await this.prisma.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: uploadedById,
          action: 'DOCUMENT_UPLOAD_FAILED',
          category: 'DOKUMEN',
          entityType: 'Document',
          details: `Gagal mengunggah dokumen tipe ${type} untuk siswa ${studentId}. Rincian: ${reason}`,
        },
      });
    } catch (err: any) {
      // Prevent logging failures from masking main exception
    }
  }

  /**
   * Upload a file and create a Document record.
   * Saves file to local uploads/ directory with a UUID-based name.
   */
  async upload(
    file: Express.Multer.File,
    studentId: string,
    type: DocumentType,
    uploadedById: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    // Path traversal check on original filename
    if (
      file.originalname.includes('..') ||
      file.originalname.includes('/') ||
      file.originalname.includes('\\')
    ) {
      await this.logUploadFailure(studentId, uploadedById, 'Traversal path detected', type);
      throw new BadRequestException(
        'Filename contains invalid path characters or traversal sequences',
      );
    }

    // Max 10 MB
    if (file.size > 10 * 1024 * 1024) {
      await this.logUploadFailure(studentId, uploadedById, 'File size exceeds 10 MB limit', type);
      throw new BadRequestException('File size exceeds 10 MB limit');
    }

    // 1. Validate file extension independently from client-provided MIME
    const ext = extname(file.originalname).toLowerCase() || '.bin';
    const expectedMimeFromExt = EXT_TO_MIME[ext];
    if (!expectedMimeFromExt) {
      await this.logUploadFailure(studentId, uploadedById, `Extension not allowed: ${ext}`, type);
      throw new BadRequestException(
        `File extension "${ext}" is not allowed. Only PDF, JPG, PNG, and WEBP files are accepted`,
      );
    }

    // 2. Validate magic bytes from file buffer
    const detectedMime = detectMimeFromBuffer(file.buffer);
    if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
      await this.logUploadFailure(studentId, uploadedById, 'Magic byte check failed or MIME not allowed', type);
      throw new BadRequestException(
        'File content does not match an allowed type (PDF, JPG, PNG, WEBP). File may be corrupted or spoofed.',
      );
    }

    // 3. Cross-check: magic bytes must match file extension
    if (detectedMime !== expectedMimeFromExt) {
      await this.logUploadFailure(studentId, uploadedById, `Spoofed extension ${ext} vs actual MIME ${detectedMime}`, type);
      throw new BadRequestException(
        `File extension "${ext}" does not match actual file content (${detectedMime}). Possible file spoofing.`,
      );
    }

    // 4. Antivirus Scan
    const isClean = await this.scanUploadedFile(file);
    if (!isClean) {
      await this.logUploadFailure(studentId, uploadedById, 'Antivirus scan blocked this file', type);
      throw new BadRequestException('File is blocked by antivirus scan');
    }

    const id = randomUUID();
    const storedName = await this.storage.upload(id, file.buffer, detectedMime);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Find existing latest document of this type
        const existingDoc = await tx.document.findFirst({
          where: { studentId, type, isLatest: true, deletedAt: null }
        });

        let version = 1;
        let previousId = null;

        if (existingDoc) {
          version = existingDoc.version + 1;
          previousId = existingDoc.id;

          // Set previous document to isLatest = false
          await tx.document.update({
            where: { id: existingDoc.id },
            data: { isLatest: false }
          });
        }

        // Create DB record — use detected MIME from magic bytes, not client-provided
        const isDbStorage = this.storage instanceof DatabaseStorageProvider;
        const doc = await tx.document.create({
          data: {
            id,
            studentId,
            uploadedById,
            type,
            originalName: file.originalname,
            storedName,
            mimeType: detectedMime,
            sizeBytes: file.size,
            storagePath: storedName, // Store only the relative filename/storedName
            fileData: isDbStorage ? file.buffer : null,
            status: 'UPLOADED',
            version,
            isLatest: true,
            previousId,
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            id: `LOG_${randomUUID()}`,
            actorUserId: uploadedById,
            action: 'DOCUMENT_UPLOAD_SUCCESS',
            category: 'DOKUMEN',
            entityType: 'Document',
            entityId: doc.id,
            details: `Uploaded document "${doc.originalName}" (${doc.type} v${doc.version}) for student ${studentId}`,
          },
        });

        return doc;
      }).then((result) => {
        this.backupService.createDbOnlyBackup('DOCUMENT_UPLOAD').catch(() => {});
        return result;
      });
    } catch (err) {
      try {
        await this.storage.delete(id);
      } catch (deleteErr) {
        // Log delete error but throw original transaction error
      }
      throw err;
    }
  }

  /**
   * Get a readable stream for a document file.
   * Returns the stream and metadata for serving.
   */
  async getFileStream(id: string, actor: any) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { Student: true },
    });
    if (!doc || doc.deletedAt) throw new NotFoundException('Document not found');

    try {
      const buffer = await this.storage.download(doc.id);
      const stream = Readable.from(buffer);

      // Log download/preview event
      await this.prisma.activityLog.create({
        data: {
          id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          actorUserId: actor.id,
          action: 'DOWNLOAD_DOCUMENT',
          category: 'DOKUMEN',
          entityType: 'Document',
          entityId: doc.id,
          details: `Document "${doc.originalName}" (${doc.type}) for student "${doc.Student?.nama || doc.studentId}" downloaded/previewed`,
        },
      });

      return { stream, mimeType: doc.mimeType, originalName: doc.originalName };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new NotFoundException('File not found in storage');
    }
  }

  /**
   * Update the verification status of a document.
   */
  async updateStatus(
    id: string,
    status: DocumentStatus,
    actorUserId: string,
    notes?: string,
  ) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Document not found');

    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.update({
        where: { id },
        data: {
          status,
          verificationNotes: notes || null,
          verifiedBy: actorUserId,
          verifiedAt: new Date(),
        },
      });

      const auditDetails = {
        before: { status: existing.status, originalName: existing.originalName, type: existing.type, verificationNotes: existing.verificationNotes },
        after: { status: doc.status, originalName: doc.originalName, type: doc.type, verificationNotes: doc.verificationNotes },
      };

      await tx.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId,
          action: `DOCUMENT_${status}`,
          category: 'DOKUMEN',
          entityType: 'Document',
          entityId: doc.id,
          details: `Document "${doc.originalName}" status changed to ${status}. Changes: ${JSON.stringify(auditDetails)}`,
        },
      });

      return doc;
    }).then((result) => {
      this.backupService.createDbOnlyBackup('DOCUMENT_UPDATE_STATUS').catch(() => {});
      return result;
    });
  }

  /**
   * Soft-delete a document (move to trash).
   */
  async softDelete(id: string, actorId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.deletedAt) throw new NotFoundException('Document not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: actorId },
      });

      const auditDetails = {
        before: { status: doc.status, originalName: doc.originalName, type: doc.type, deletedAt: null },
        after: { status: doc.status, originalName: doc.originalName, type: doc.type, deletedAt: 'now' },
      };

      await tx.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: actorId,
          action: 'DELETE_DOCUMENT',
          category: 'DOKUMEN',
          entityType: 'Document',
          entityId: id,
          details: `Soft-deleted document "${doc.originalName}". Changes: ${JSON.stringify(auditDetails)}`,
        },
      });

      return { message: `Document "${doc.originalName}" moved to trash` };
    }).then((result) => {
      this.backupService.createDbOnlyBackup('DOCUMENT_SOFT_DELETE').catch(() => {});
      return result;
    });
  }

  /**
   * Trash Bin — Liste tous les documents soft-deleted
   */
  async findTrash() {
    return this.prisma.document.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  }

  /**
   * Restaure un document soft-deleted
   */
  async restore(id: string, actorId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (!doc.deletedAt) throw new BadRequestException('Document is not deleted');

    return this.prisma.$transaction(async (tx) => {
      const restored = await tx.document.update({
        where: { id },
        data: { deletedAt: null, deletedBy: null },
      });

      const auditDetails = {
        before: { deletedAt: doc.deletedAt, originalName: doc.originalName, type: doc.type },
        after: { deletedAt: null, originalName: restored.originalName, type: restored.type },
      };

      await tx.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: actorId,
          action: 'RESTORE_DOCUMENT',
          category: 'DOKUMEN',
          entityType: 'Document',
          entityId: restored.id,
          details: `Restored document "${restored.originalName}". Changes: ${JSON.stringify(auditDetails)}`,
        },
      });

      return restored;
    }).then((result) => {
      this.backupService.createDbOnlyBackup('DOCUMENT_RESTORE').catch(() => {});
      return result;
    });
  }

  /**
   * Suppression définitive — hard delete le document ET le fichier physique
   */
  async permanentDelete(id: string, actorId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    // Delete from database first
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.document.delete({ where: { id } });

      await tx.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: actorId,
          action: 'PERMANENT_DELETE_DOCUMENT',
          category: 'DOKUMEN',
          entityType: 'Document',
          entityId: id,
          details: `Permanently deleted document "${doc.originalName}"`,
        },
      });

      return { message: `Document "${doc.originalName}" permanently deleted` };
    });

    // Delete file from storage AFTER transaction committed successfully
    try {
      await this.storage.delete(doc.id);
    } catch {
      // Ignore errors if file already deleted/gone
    }

    this.backupService.createDbOnlyBackup('DOCUMENT_PERMANENT_DELETE').catch(() => {});

    return result;
  }

  async updateReviewStatus(
    id: string,
    reviewStatus: ReviewStatus,
    actorUserId: string,
  ) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Document not found');

    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.update({
        where: { id },
        data: { reviewStatus },
      });

      await tx.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId,
          action: `DOCUMENT_REVIEW_${reviewStatus}`,
          category: 'DOKUMEN',
          entityType: 'Document',
          entityId: doc.id,
          details: `Document "${doc.originalName}" review status changed to ${reviewStatus}`,
        },
      });

      return doc;
    }).then((result) => {
      this.backupService.createDbOnlyBackup('DOCUMENT_REVIEW_STATUS').catch(() => {});
      return result;
    });
  }
}
