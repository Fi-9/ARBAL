import { Injectable, Logger, BadRequestException, ServiceUnavailableException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrStatus } from '@prisma/client';
import { basename } from 'path';
import { StorageProvider } from './storage/storage-provider.interface';

/**
 * OcrService — proxies document images to the Python OCR microservice.
 *
 * Pipeline:
 *  1. Read stored file from storage
 *  2. POST multipart to Python FastAPI (POST /ocr/ktp or /ocr/kk)
 *  3. Receive parsed JSON result
 *  4. Persist ocrResult + ocrStatus on the Document record
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly ocrBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    @Inject('StorageProvider') private storage: StorageProvider,
  ) {
    this.ocrBaseUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000';
  }

  /** Build common headers for OCR service requests */
  private getOcrHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = contentType;
    const token = process.env.OCR_INTERNAL_TOKEN;
    if (token) headers['X-Internal-Token'] = token;
    return headers;
  }

  /**
   * Run OCR on a document by its DB id.
   * Determines the endpoint (/ocr/ktp or /ocr/kk) from the document type.
   */
  async extract(documentId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      throw new BadRequestException('Document not found');
    }

    // Determine OCR endpoint based on document type
    const endpoint = this.resolveEndpoint(doc.type);
    if (!endpoint) {
      throw new BadRequestException(
        `OCR is not supported for document type ${doc.type}. Only KTP_AYAH, KTP_IBU, and KARTU_KELUARGA are supported.`,
      );
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await this.storage.download(doc.id);
    } catch {
      throw new BadRequestException('Document file data not found in storage');
    }

    // Mark as processing
    await this.prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: OcrStatus.PROCESSING },
    });

    try {
      // Build multipart form data
      const boundary = `----FormBoundary${Date.now()}`;
      const fileName = basename(doc.originalName);

      const bodyParts: Buffer[] = [];

      // file part
      bodyParts.push(
        Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
          `Content-Type: ${doc.mimeType}\r\n\r\n`,
        ),
      );
      bodyParts.push(fileBuffer);
      bodyParts.push(Buffer.from('\r\n'));

      // closing boundary
      bodyParts.push(Buffer.from(`--${boundary}--\r\n`));

      const body = Buffer.concat(bodyParts);

      const response = await fetch(`${this.ocrBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getOcrHeaders(`multipart/form-data; boundary=${boundary}`),
        body,
        signal: AbortSignal.timeout(60_000), // 60s timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OCR service returned ${response.status}: ${errorText}`);
        throw new ServiceUnavailableException(
          `OCR service error: ${response.status} — ${errorText}`,
        );
      }

      const result = await response.json();

      let ocrConfidence = null;
      if (result && typeof result.confidence === 'number') {
        ocrConfidence = result.confidence;
      }

      // Persist result in DB
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          ocrResult: result,
          ocrStatus: OcrStatus.COMPLETED,
          ocrConfidence,
          ocrRunAt: new Date(),
        },
      });

      return result;
    } catch (err) {
      // Mark as failed
      await this.prisma.document.update({
        where: { id: documentId },
        data: { ocrStatus: OcrStatus.FAILED },
      });

      if (err instanceof ServiceUnavailableException || err instanceof BadRequestException) {
        throw err;
      }
      // Log full error internally but return generic message to client
      this.logger.error(`OCR extraction failed for document ${documentId}: ${err.message}`, err.stack);
      throw new ServiceUnavailableException('OCR extraction failed. Please try again later.');
    }
  }

  /**
   * Check if the Python OCR service is healthy.
   */
  async healthCheck(): Promise<{ available: boolean; detail?: string }> {
    try {
      const res = await fetch(`${this.ocrBaseUrl}/health`, {
        headers: this.getOcrHeaders(),
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        const data = await res.json();
        return { available: true, detail: JSON.stringify(data) };
      }
      return { available: false, detail: `HTTP ${res.status}` };
    } catch {
      return { available: false, detail: 'Service unreachable' };
    }
  }

  /**
   * Map document type to OCR endpoint.
   */
  private resolveEndpoint(docType: string): string | null {
    switch (docType) {
      case 'KTP_AYAH':
      case 'KTP_IBU':
        return '/ocr/ktp';
      case 'KK':
        return '/ocr/kk';
      default:
        return null;
    }
  }
}
