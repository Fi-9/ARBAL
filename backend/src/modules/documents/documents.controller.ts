import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { OcrService } from './ocr.service';
import { UpdateDocumentStatusDto, UploadDocumentDto, UpdateDocumentReviewStatusDto } from './dto/document.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

interface AuthedRequest extends Request {
  user: { id: string; email: string; name: string; role: string; permissions: string[] };
}

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService, private ocrService: OcrService) {}

  /** POST /api/v1/documents/upload — upload a file */
  @Post('upload')
  @Permissions('document.upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
        fieldNameSize: 100,
        fields: 10,
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a document file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        studentId: { type: 'string' },
        type: { type: 'string', enum: ['KK', 'AKTA', 'IJAZAH_TERAKHIR', 'RAPORT', 'PAS_FOTO', 'KTP_AYAH', 'KTP_IBU', 'SURAT_PINDAH', 'SERTIFIKAT', 'PRAKERIN', 'PENDUKUNG'] },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.documentsService.upload(file, body.studentId, body.type, req.user.id);
  }

  /** GET /api/v1/documents/student/:studentId — all docs for a student */
  @Get('student/:studentId')
  @Permissions('document.read')
  async findByStudent(@Param('studentId') studentId: string) {
    return this.documentsService.findByStudent(studentId);
  }

  /** GET /api/v1/documents/trash — list all soft-deleted documents (MUST be above :id) */
  @Get('trash')
  @Permissions('document.delete')
  @ApiOperation({ summary: 'List all soft-deleted documents' })
  async findTrash() {
    return this.documentsService.findTrash();
  }

  /** GET /api/v1/documents/:id/file — serve the actual file */
  @Get(':id/file')
  @Permissions('document.read')
  @ApiOperation({ summary: 'Download/serve a document file' })
  async serveFile(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const { stream, mimeType, originalName } = await this.documentsService.getFileStream(id, req.user);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(originalName)}"`,
    });
    stream.pipe(res);
  }

  /** GET /api/v1/documents/:id — single document metadata */
  @Get(':id')
  @Permissions('document.read')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  /** DELETE /api/v1/documents/:id — soft-delete a document (move to trash) */
  @Delete(':id')
  @Permissions('document.delete')
  @ApiOperation({ summary: 'Soft-delete a document' })
  async softDelete(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.documentsService.softDelete(id, req.user.id);
  }

  /** POST /api/v1/documents/:id/restore — restore a soft-deleted document */
  @Post(':id/restore')
  @Permissions('document.delete')
  @ApiOperation({ summary: 'Restore a soft-deleted document' })
  async restore(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.documentsService.restore(id, req.user.id);
  }

  /** DELETE /api/v1/documents/:id/permanent — permanently delete a document */
  @Delete(':id/permanent')
  @Permissions('document.delete')
  @ApiOperation({ summary: 'Permanently delete a document and its file' })
  async permanentDelete(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.documentsService.permanentDelete(id, req.user.id);
  }

  /**
   * PATCH /api/v1/documents/:id/status — verify or reject a document
   */
  @Patch(':id/status')
  @Permissions('document.verify')
  @ApiOperation({ summary: 'Update document verification status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateDocumentStatusDto,
    @Req() req: AuthedRequest,
  ) {
    return this.documentsService.updateStatus(id, body.status, req.user.id, body.notes || body.reason);
  }

  @Patch(':id/review-status')
  @Permissions('document.verify')
  @ApiOperation({ summary: 'Update document review status' })
  async updateReviewStatus(
    @Param('id') id: string,
    @Body() body: UpdateDocumentReviewStatusDto,
    @Req() req: AuthedRequest,
  ) {
    return this.documentsService.updateReviewStatus(id, body.reviewStatus, req.user.id);
  }

  /**
   * POST /api/v1/documents/:id/ocr — run OCR extraction on a document
   */
  @Post(':id/ocr')
  @Permissions('document.verify')
  @ApiOperation({ summary: 'Run OCR extraction on a document (KTP/KK)' })
  async runOcr(@Param('id') id: string) {
    return this.ocrService.extract(id);
  }
}
