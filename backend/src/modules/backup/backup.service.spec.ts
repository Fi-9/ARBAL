/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from './backup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Path Traversal and Input Validation', () => {
    it('should throw BadRequestException when restore filename has path traversal sequence', async () => {
      await expect(service.restoreFromBackup('../invalid-traversal.zip', 'user-id'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException when restore filename has path separators', async () => {
      await expect(service.restoreFromBackup('folder/arbal-backup-2026-06-21T02-00-00-000Z.zip', 'user-id'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException when restore filename is not in expected format', async () => {
      await expect(service.restoreFromBackup('arbal-backup-wrong-format.zip', 'user-id'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw NotFoundException when restore file name format is correct but file does not exist', async () => {
      // The format matches the pattern, but the file doesn't exist
      const validFormatName = 'arbal-backup-2026-06-21T02-00-00-000Z.zip';
      await expect(service.restoreFromBackup(validFormatName, 'user-id'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deleting a traversal path name', async () => {
      await expect(service.deleteBackup('../traversal.zip', 'user-id'))
        .rejects
        .toThrow(BadRequestException);
    });
  });
});
