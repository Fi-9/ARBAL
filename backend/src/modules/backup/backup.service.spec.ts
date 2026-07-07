/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from './backup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { unlinkSync, writeFileSync } from 'fs';

jest.mock('archiver', () => {
  return {
    ZipArchive: jest.fn().mockImplementation(() => ({
      pipe: jest.fn(),
      append: jest.fn(),
      directory: jest.fn(),
      finalize: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    })),
  };
});

describe('BackupService', () => {
  let service: BackupService;
  let prismaService: PrismaService;

  const mockPrismaService: any = {
    user: {
      findFirst: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  function createStoredZip(entries: Array<{ name: string; content?: string }>): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBuffer = Buffer.from(entry.name, 'utf8');
      const contentBuffer = Buffer.from(entry.content ?? '', 'utf8');

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(0, 14);
      localHeader.writeUInt32LE(contentBuffer.length, 18);
      localHeader.writeUInt32LE(contentBuffer.length, 22);
      localHeader.writeUInt16LE(nameBuffer.length, 26);
      localHeader.writeUInt16LE(0, 28);

      localParts.push(localHeader, nameBuffer, contentBuffer);

      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(0, 16);
      centralHeader.writeUInt32LE(contentBuffer.length, 20);
      centralHeader.writeUInt32LE(contentBuffer.length, 24);
      centralHeader.writeUInt16LE(nameBuffer.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(entry.name.endsWith('/') ? 0x10 : 0, 38);
      centralHeader.writeUInt32LE(offset, 42);

      centralParts.push(centralHeader, nameBuffer);
      offset += localHeader.length + nameBuffer.length + contentBuffer.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralDirectory.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectory, eocd]);
  }

  function hashString(content: string): string {
    return createHash('sha256').update(Buffer.from(content, 'utf8')).digest('hex');
  }

  function createManifestEntry(name: string, content: string) {
    return {
      [name]: {
        sha256: hashString(content),
        size: Buffer.byteLength(content, 'utf8'),
      },
    };
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Path Traversal and Input Validation', () => {
    it('should throw BadRequestException when restore filename has path traversal sequence', async () => {
      await expect(service.restoreFromBackup('../invalid-traversal.zip', 'user-id', 'restore for testing'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException when restore filename has path separators', async () => {
      await expect(service.restoreFromBackup('folder/arbal-backup-2026-06-21T02-00-00-000Z.zip', 'user-id', 'restore for testing'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException when restore filename does not end with .zip', async () => {
      await expect(service.restoreFromBackup('arbal-backup-wrong-format.txt', 'user-id', 'restore for testing'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw NotFoundException when restore file name format is correct but file does not exist', async () => {
      // The format matches the pattern, but the file doesn't exist
      const validFormatName = 'arbal-backup-2026-06-21T02-00-00-000Z.zip';
      await expect(service.restoreFromBackup(validFormatName, 'user-id', 'restore for testing'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deleting a traversal path name', async () => {
      await expect(service.deleteBackup('../traversal.zip', 'user-id'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should reject malicious uploaded ZIP archives before they enter the official backup store', async () => {
      const sql = 'SELECT 1;';
      const metadata = '{}';
      const readme = 'backup';
      const maliciousZip = createStoredZip([
        { name: 'database.sql', content: sql },
        { name: 'metadata.json', content: metadata },
        { name: 'README.txt', content: readme },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              ...createManifestEntry('database.sql', sql),
              ...createManifestEntry('metadata.json', metadata),
              ...createManifestEntry('README.txt', readme),
            },
          }),
        },
        { name: '../evil.txt', content: 'owned' },
      ]);

      await expect(
        service.uploadAndRestoreBackup(
          {
            originalname: 'malicious.zip',
            buffer: maliciousZip,
          } as Express.Multer.File,
          'user-id',
          'restore for security testing',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject restore attempts when the reason is missing or too short', async () => {
      const validFormatName = 'arbal-backup-2026-06-21T02-00-00-000Z.zip';
      await expect(service.restoreFromBackup(validFormatName, 'user-id', 'short'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should reject upload restore attempts when the reason is missing or too short', async () => {
      const validZip = createStoredZip([
        { name: 'database.sql', content: 'SELECT 1;' },
        { name: 'metadata.json', content: '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}' },
        { name: 'README.txt', content: 'backup info' },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              ...createManifestEntry('database.sql', 'SELECT 1;'),
              ...createManifestEntry('metadata.json', '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}'),
              ...createManifestEntry('README.txt', 'backup info'),
            },
          }),
        },
      ]);

      await expect(
        service.uploadAndRestoreBackup(
          {
            originalname: 'valid.zip',
            buffer: validZip,
          } as Express.Multer.File,
          'user-id',
          'short',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should treat a structurally valid ZIP backup as verifiable', async () => {
      const fileName = `verify-${Date.now()}.zip`;
      const filePath = service.getBackupFilePath(fileName);
      const sql = 'SELECT 1;';
      const metadata = '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}';
      const readme = 'backup info';
      const uploadContent = 'document';
      const validZip = createStoredZip([
        { name: 'database.sql', content: sql },
        { name: 'metadata.json', content: metadata },
        { name: 'README.txt', content: readme },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              ...createManifestEntry('database.sql', sql),
              ...createManifestEntry('metadata.json', metadata),
              ...createManifestEntry('README.txt', readme),
              ...createManifestEntry('uploads/student/doc.txt', uploadContent),
            },
          }),
        },
        { name: 'uploads/' },
        { name: 'uploads/student/doc.txt', content: uploadContent },
      ]);

      writeFileSync(filePath, validZip);
      try {
        await expect(service.verifyBackupFile(fileName)).resolves.toBe(true);
      } finally {
        unlinkSync(filePath);
      }
    });

    it('should reject backup metadata with an unsupported database type during verification', async () => {
      const fileName = `verify-invalid-meta-${Date.now()}.zip`;
      const filePath = service.getBackupFilePath(fileName);
      const sql = 'SELECT 1;';
      const metadata = '{"database":"mysql","backup_format":"zip+plain-sql"}';
      const readme = 'backup info';
      const invalidZip = createStoredZip([
        { name: 'database.sql', content: sql },
        { name: 'metadata.json', content: metadata },
        { name: 'README.txt', content: readme },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              ...createManifestEntry('database.sql', sql),
              ...createManifestEntry('metadata.json', metadata),
              ...createManifestEntry('README.txt', readme),
            },
          }),
        },
      ]);

      writeFileSync(filePath, invalidZip);
      try {
        await expect(service.verifyBackupFile(fileName)).resolves.toBe(false);
      } finally {
        unlinkSync(filePath);
      }
    });

    it('should reject backup files whose manifest checksum does not match the actual content', async () => {
      const fileName = `verify-bad-manifest-${Date.now()}.zip`;
      const filePath = service.getBackupFilePath(fileName);
      const sql = 'SELECT 1;';
      const metadata = '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}';
      const readme = 'backup info';
      const invalidZip = createStoredZip([
        { name: 'database.sql', content: sql },
        { name: 'metadata.json', content: metadata },
        { name: 'README.txt', content: readme },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              'database.sql': {
                sha256: 'deadbeef',
                size: Buffer.byteLength(sql, 'utf8'),
              },
              ...createManifestEntry('metadata.json', metadata),
              ...createManifestEntry('README.txt', readme),
            },
          }),
        },
      ]);

      writeFileSync(filePath, invalidZip);
      try {
        await expect(service.verifyBackupFile(fileName)).resolves.toBe(false);
      } finally {
        unlinkSync(filePath);
      }
    });

    it('should reject ZIP archives that exceed maximum uncompressed size limit', async () => {
      const largeContent = 'x'.repeat(1024);
      const entries = [
        { name: 'database.sql', content: 'SELECT 1;' },
        { name: 'metadata.json', content: '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}' },
        { name: 'README.txt', content: 'backup info' },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              ...createManifestEntry('database.sql', 'SELECT 1;'),
              ...createManifestEntry('metadata.json', '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}'),
              ...createManifestEntry('README.txt', 'backup info'),
            },
          }),
        },
      ];

      for (let i = 0; i < 100; i++) {
        entries.push({ name: `uploads/file-${i}.dat`, content: largeContent });
      }

      const maliciousZip = createStoredZip(entries);

      await expect(
        service.uploadAndRestoreBackup(
          {
            originalname: 'zipbomb.zip',
            buffer: maliciousZip,
          } as Express.Multer.File,
          'user-id',
          'restore for zip bomb testing purposes',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject ZIP archives with missing required entries', async () => {
      const incompleteZip = createStoredZip([
        { name: 'database.sql', content: 'SELECT 1;' },
      ]);

      await expect(
        service.uploadAndRestoreBackup(
          {
            originalname: 'incomplete.zip',
            buffer: incompleteZip,
          } as Express.Multer.File,
          'user-id',
          'restore for missing entries testing purposes',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject ZIP archives with forbidden entry names', async () => {
      const forbiddenZip = createStoredZip([
        { name: 'database.sql', content: 'SELECT 1;' },
        { name: 'metadata.json', content: '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}' },
        { name: 'README.txt', content: 'backup info' },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              ...createManifestEntry('database.sql', 'SELECT 1;'),
              ...createManifestEntry('metadata.json', '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}'),
              ...createManifestEntry('README.txt', 'backup info'),
            },
          }),
        },
        { name: 'etc/passwd', content: 'malicious' },
      ]);

      await expect(
        service.uploadAndRestoreBackup(
          {
            originalname: 'forbidden.zip',
            buffer: forbiddenZip,
          } as Express.Multer.File,
          'user-id',
          'restore for forbidden entry testing purposes',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject ZIP archives with duplicate entry names', async () => {
      const duplicateZip = createStoredZip([
        { name: 'database.sql', content: 'SELECT 1;' },
        { name: 'metadata.json', content: '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}' },
        { name: 'README.txt', content: 'backup info' },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              ...createManifestEntry('database.sql', 'SELECT 1;'),
              ...createManifestEntry('metadata.json', '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}'),
              ...createManifestEntry('README.txt', 'backup info'),
            },
          }),
        },
        { name: 'database.sql', content: 'SELECT 2;' },
      ]);

      await expect(
        service.uploadAndRestoreBackup(
          {
            originalname: 'duplicate.zip',
            buffer: duplicateZip,
          } as Express.Multer.File,
          'user-id',
          'restore for duplicate entry testing purposes',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject restore when metadata version is unsupported', async () => {
      const originalDbUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      const fileName = `verify-unsupported-version-${Date.now()}.zip`;
      const filePath = service.getBackupFilePath(fileName);
      const sql = 'SELECT 1;';
      const metadata = '{"version":"99.0.0","database":"postgresql","backup_format":"zip+plain-sql"}';
      const readme = 'backup info';
      const invalidZip = createStoredZip([
        { name: 'database.sql', content: sql },
        { name: 'metadata.json', content: metadata },
        { name: 'README.txt', content: readme },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              ...createManifestEntry('database.sql', sql),
              ...createManifestEntry('metadata.json', metadata),
              ...createManifestEntry('README.txt', readme),
            },
          }),
        },
      ]);

      writeFileSync(filePath, invalidZip);
      try {
        await expect(
          service.restoreFromBackup(fileName, 'user-id', 'restore for version mismatch testing'),
        ).rejects.toThrow(BadRequestException);
      } finally {
        unlinkSync(filePath);
        process.env.DATABASE_URL = originalDbUrl;
      }
    }, 15000);

    it('should reject restore when metadata database type is unsupported', async () => {
      const originalDbUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      const fileName = `verify-unsupported-db-${Date.now()}.zip`;
      const filePath = service.getBackupFilePath(fileName);
      const sql = 'SELECT 1;';
      const metadata = '{"version":"2.0.0","database":"mysql","backup_format":"zip+plain-sql"}';
      const readme = 'backup info';
      const invalidZip = createStoredZip([
        { name: 'database.sql', content: sql },
        { name: 'metadata.json', content: metadata },
        { name: 'README.txt', content: readme },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              ...createManifestEntry('database.sql', sql),
              ...createManifestEntry('metadata.json', metadata),
              ...createManifestEntry('README.txt', readme),
            },
          }),
        },
      ]);

      writeFileSync(filePath, invalidZip);
      try {
        await expect(
          service.restoreFromBackup(fileName, 'user-id', 'restore for db type mismatch testing'),
        ).rejects.toThrow(BadRequestException);
      } finally {
        unlinkSync(filePath);
        process.env.DATABASE_URL = originalDbUrl;
      }
    }, 15000);

    it('should log BACKUP_RESTORE_BLOCKED audit when restore is attempted on disabled endpoint', async () => {
      const originalEnv = process.env.ALLOW_BACKUP_RESTORE;
      process.env.ALLOW_BACKUP_RESTORE = 'false';

      try {
        const allowed = await service.assertRestoreApiEnabled('user-id', 'test-backup.zip');
        expect(allowed).toBe(false);
        expect(mockPrismaService.activityLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              action: 'BACKUP_RESTORE_BLOCKED',
              actorUserId: 'user-id',
            }),
          }),
        );
      } finally {
        process.env.ALLOW_BACKUP_RESTORE = originalEnv;
      }
    });

    it('should reject upload restore with empty buffer', async () => {
      await expect(
        service.uploadAndRestoreBackup(
          {
            originalname: 'empty.zip',
            buffer: Buffer.alloc(0),
          } as Express.Multer.File,
          'user-id',
          'restore for empty buffer testing purposes',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject upload restore with non-ZIP buffer', async () => {
      await expect(
        service.uploadAndRestoreBackup(
          {
            originalname: 'notazip.zip',
            buffer: Buffer.from('this is not a zip file'),
          } as Express.Multer.File,
          'user-id',
          'restore for non-zip buffer testing purposes',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject upload restore with non-.zip extension', async () => {
      const validZip = createStoredZip([
        { name: 'database.sql', content: 'SELECT 1;' },
        { name: 'metadata.json', content: '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}' },
        { name: 'README.txt', content: 'backup info' },
        {
          name: 'manifest.json',
          content: JSON.stringify({
            version: '1.0.0',
            algorithm: 'sha256',
            generated_at: '2026-07-07T00:00:00.000Z',
            entries: {
              ...createManifestEntry('database.sql', 'SELECT 1;'),
              ...createManifestEntry('metadata.json', '{"version":"2.0.0","database":"postgresql","backup_format":"zip+plain-sql"}'),
              ...createManifestEntry('README.txt', 'backup info'),
            },
          }),
        },
      ]);

      await expect(
        service.uploadAndRestoreBackup(
          {
            originalname: 'backup.txt',
            buffer: validZip,
          } as Express.Multer.File,
          'user-id',
          'restore for wrong extension testing purposes',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
