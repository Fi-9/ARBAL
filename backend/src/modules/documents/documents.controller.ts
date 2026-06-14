import {
  Controller,
  Get,
  Post,
  Patch,
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
import { UpdateDocumentStatusDto, UploadDocumentDto } from './dto/document.dto';
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
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a document file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        studentId: { type: 'string' },
        type: { type: 'string', enum: ['IJAZAH', 'KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'PAS_FOTO', 'RAPOR', 'KTP_AYAH', 'KTP_IBU'] },
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
  async findByStudent(@Param('studentId') studentId: string) {
    return this.documentsService.findByStudent(studentId);
  }

  /** GET /api/v1/documents/:id/file — serve the actual file */
  @Get(':id/file')
  @ApiOperation({ summary: 'Download/serve a document file' })
  async serveFile(@Param('id') id: string, @Res() res: Response) {
    const { stream, mimeType, originalName } = await this.documentsService.getFileStream(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(originalName)}"`,
    });
    stream.pipe(res);
  }

  /** GET /api/v1/documents/:id — single document metadata */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
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
    return this.documentsService.updateStatus(id, body.status, req.user.id);
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
