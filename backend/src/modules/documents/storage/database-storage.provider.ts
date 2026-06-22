/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageProvider } from './storage-provider.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DatabaseStorageProvider implements StorageProvider {
  constructor(private prisma: PrismaService) {}

  async upload(fileId: string, buffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : '.jpg';
    return `${fileId}${ext}`;
  }

  async download(fileId: string): Promise<Buffer> {
    const doc = await this.prisma.document.findUnique({ where: { id: fileId } });
    if (!doc || !doc.fileData) {
      throw new NotFoundException('File not found in database');
    }
    return Buffer.from(doc.fileData);
  }

  async delete(fileId: string): Promise<void> {
    await this.prisma.document.update({
      where: { id: fileId },
      data: { fileData: null },
    });
  }
}
