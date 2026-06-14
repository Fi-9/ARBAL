import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentStatus, DocumentType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync, writeFileSync, createReadStream } from 'fs';
import { join, extname } from 'path';

const UPLOADS_DIR = join(__dirname, '..', '..', '..', 'uploads');

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {
    // Ensure uploads directory exists
    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  /** Get all documents for a given student */
  async findByStudent(studentId: string) {
    return this.prisma.document.findMany({
      where: { studentId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /** Get a single document by ID */
  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
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

    // Validate file type
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPG, and PNG files are accepted');
    }

    // Max 10 MB
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 10 MB limit');
    }

    const id = uuidv4();
    const ext = extname(file.originalname) || '.bin';
    const storedName = `${id}${ext}`;
    const storagePath = join(UPLOADS_DIR, storedName);

    // Write file to disk
    writeFileSync(storagePath, file.buffer);

    // Create DB record
    const doc = await this.prisma.document.create({
      data: {
        id,
        studentId,
        uploadedById,
        type,
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath,
        status: 'VERIFIKASI',
      },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        actorUserId: uploadedById,
        action: 'UPLOAD_DOCUMENT',
        category: 'DOKUMEN',
        entityType: 'Document',
        entityId: doc.id,
        details: `Uploaded document "${doc.originalName}" (${doc.type}) for student ${studentId}`,
      },
    });

    return doc;
  }

  /**
   * Get a readable stream for a document file.
   * Returns the stream and metadata for serving.
   */
  async getFileStream(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    if (!existsSync(doc.storagePath)) {
      throw new NotFoundException('File not found on disk');
    }

    const stream = createReadStream(doc.storagePath);
    return { stream, mimeType: doc.mimeType, originalName: doc.originalName };
  }

  /**
   * Update the verification status of a document.
   */
  async updateStatus(
    id: string,
    status: DocumentStatus,
    actorUserId: string,
  ) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Document not found');

    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.update({
        where: { id },
        data: { status },
      });

      await tx.activityLog.create({
        data: {
          id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          actorUserId,
          action: `DOCUMENT_${status}`,
          category: 'DOKUMEN',
          entityType: 'Document',
          entityId: doc.id,
          details: `Document "${doc.originalName}" status changed to ${status}`,
        },
      });

      return doc;
    });
  }
}
