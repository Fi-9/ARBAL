/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageProvider } from './storage-provider.interface';
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? resolve(process.env.UPLOADS_DIR)
  : join(__dirname, '..', '..', '..', '..', 'uploads');

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor() {
    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async upload(fileId: string, buffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : '.jpg';
    const storedName = `${fileId}${ext}`;
    const storagePath = join(UPLOADS_DIR, storedName);
    writeFileSync(storagePath, buffer);
    return storedName;
  }

  async download(fileId: string): Promise<Buffer> {
    for (const ext of ['.pdf', '.png', '.jpg', '.jpeg']) {
      const path = join(UPLOADS_DIR, `${fileId}${ext}`);
      if (existsSync(path)) {
        return readFileSync(path);
      }
    }
    throw new NotFoundException('File not found on disk');
  }

  async delete(fileId: string): Promise<void> {
    for (const ext of ['.pdf', '.png', '.jpg', '.jpeg']) {
      const path = join(UPLOADS_DIR, `${fileId}${ext}`);
      if (existsSync(path)) {
        unlinkSync(path);
        return;
      }
    }
  }
}
