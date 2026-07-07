import { BadRequestException, Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ZipArchive } from 'archiver';
import { cpSync, createWriteStream, existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { basename, isAbsolute, relative, resolve } from 'path';
import { createHash } from 'crypto';
import { inflateRawSync } from 'zlib';

const execFileAsync = promisify(execFile);

const BACKUPS_DIR = resolve(__dirname, '..', '..', '..', 'backups');
const UPLOADS_DIR = resolve(__dirname, '..', '..', '..', 'uploads');
const DB_ONLY_BACKUPS_DIR = resolve(BACKUPS_DIR, 'db-only');
const BACKUP_STAGING_DIR = resolve(BACKUPS_DIR, 'staging');
const MAX_DB_ONLY_BACKUPS = 50;
const REQUIRED_BACKUP_ENTRIES = new Set(['database.sql', 'metadata.json', 'README.txt', 'manifest.json']);
function getMaxBackups(): number {
  const val = process.env.MAX_BACKUPS;
  return val ? parseInt(val, 10) : 30;
}

function getRetentionDays(): number {
  const val = process.env.RETENTION_DAYS;
  return val ? parseInt(val, 10) : 90;
}

function isRestoreApiEnabled(): boolean {
  return process.env.ALLOW_BACKUP_RESTORE === 'true';
}

function getMaxRestoreEntries(): number {
  const val = process.env.MAX_BACKUP_RESTORE_ENTRIES;
  return val ? parseInt(val, 10) : 5000;
}

function getMaxUncompressedRestoreBytes(): number {
  const mb = process.env.MAX_BACKUP_UNCOMPRESSED_MB;
  const parsed = mb ? parseInt(mb, 10) : 512;
  return parsed * 1024 * 1024;
}

const BACKUP_FILE_PATTERN = /^.+\.zip$/i;

type ZipEntryInfo = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  isDirectory: boolean;
  compressionMethod: number;
  localHeaderOffset: number;
};

type BackupMetadata = {
  version?: string;
  created_at?: string;
  total_students?: number;
  total_documents?: number;
  database?: string;
  tag?: string;
  backup_format?: string;
  sql_dump_source?: string;
  generator_version?: string;
};

type BackupManifestEntry = {
  sha256: string;
  size: number;
};

type BackupManifest = {
  version: string;
  algorithm: 'sha256';
  generated_at: string;
  entries: Record<string, BackupManifestEntry>;
};

function ensureInsideDirectory(directory: string, candidatePath: string): void {
  const relativePath = relative(directory, candidatePath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new BadRequestException('Invalid backup path');
  }
}

function validateBackupFileName(fileName: string): void {
  if (basename(fileName) !== fileName || !BACKUP_FILE_PATTERN.test(fileName)) {
    throw new BadRequestException('Invalid backup file name');
  }
}

function resolveBackupFile(fileName: string): string {
  validateBackupFileName(fileName);
  const filePath = resolve(BACKUPS_DIR, fileName);
  ensureInsideDirectory(BACKUPS_DIR, filePath);
  return filePath;
}

function normalizeZipEntryName(rawName: string): string {
  return rawName.replace(/\\/g, '/');
}

function validateZipEntryName(name: string): void {
  if (!name || name.includes('\0')) {
    throw new BadRequestException('Backup archive contains an invalid empty entry');
  }

  if (name.startsWith('/') || /^[A-Za-z]:\//.test(name)) {
    throw new BadRequestException(`Backup archive contains an absolute path entry: ${name}`);
  }

  const parts = name.split('/').filter(Boolean);
  if (parts.some((part) => part === '.' || part === '..')) {
    throw new BadRequestException(`Backup archive contains a traversal entry: ${name}`);
  }
}

function isAllowedBackupEntry(name: string): boolean {
  return REQUIRED_BACKUP_ENTRIES.has(name) || name === 'uploads/' || name.startsWith('uploads/');
}

function parseZipEntries(buffer: Buffer): ZipEntryInfo[] {
  const minEocdSize = 22;
  const maxCommentLength = 0xffff;
  const searchStart = Math.max(0, buffer.length - (minEocdSize + maxCommentLength));

  let eocdOffset = -1;
  for (let i = buffer.length - minEocdSize; i >= searchStart; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new BadRequestException('Backup archive is not a valid ZIP file');
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (
    totalEntries === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    throw new BadRequestException('ZIP64 backup archives are not supported for restore');
  }

  const entries: ZipEntryInfo[] = [];
  let offset = centralDirectoryOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new BadRequestException('Backup archive central directory is corrupt');
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);

    const fileNameStart = offset + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > buffer.length) {
      throw new BadRequestException('Backup archive entry name is truncated');
    }

    const rawName = buffer
      .slice(fileNameStart, fileNameEnd)
      .toString((flags & 0x0800) !== 0 ? 'utf8' : 'utf8');
    const name = normalizeZipEntryName(rawName);

    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      isDirectory: name.endsWith('/'),
      compressionMethod,
      localHeaderOffset: buffer.readUInt32LE(offset + 42),
    });

    offset = fileNameEnd + extraLength + commentLength;
  }

  return entries;
}

function parseBackupMetadata(raw: string): BackupMetadata {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('Backup metadata.json is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('Backup metadata.json must contain an object');
  }

  const metadata = parsed as BackupMetadata;
  if (metadata.database && metadata.database !== 'postgresql') {
    throw new BadRequestException(`Unsupported backup database type: ${metadata.database}`);
  }

  if (metadata.backup_format && metadata.backup_format !== 'zip+plain-sql') {
    throw new BadRequestException(`Unsupported backup format: ${metadata.backup_format}`);
  }

  return metadata;
}

function hashBufferSha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function parseBackupManifest(raw: string): BackupManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('Backup manifest.json is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('Backup manifest.json must contain an object');
  }

  const manifest = parsed as BackupManifest;
  if (manifest.algorithm !== 'sha256') {
    throw new BadRequestException(`Unsupported backup manifest algorithm: ${manifest.algorithm}`);
  }
  if (!manifest.entries || typeof manifest.entries !== 'object' || Array.isArray(manifest.entries)) {
    throw new BadRequestException('Backup manifest.json must contain an entries object');
  }

  return manifest;
}

function normalizeRestoreReason(reason: string | undefined | null): string {
  const trimmed = (reason ?? '').trim();
  if (trimmed.length < 10) {
    throw new BadRequestException('Restore reason is required and must be at least 10 characters');
  }
  return trimmed;
}

function extractZipEntryBuffer(buffer: Buffer, entry: ZipEntryInfo): Buffer {
  const offset = entry.localHeaderOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new BadRequestException(`Backup archive local header is corrupt for entry: ${entry.name}`);
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) {
    throw new BadRequestException(`Backup archive entry payload is truncated: ${entry.name}`);
  }

  const compressed = buffer.slice(dataStart, dataEnd);
  if (entry.compressionMethod === 0) {
    return compressed;
  }
  if (entry.compressionMethod === 8) {
    return inflateRawSync(compressed);
  }

  throw new BadRequestException(`Unsupported ZIP compression method ${entry.compressionMethod} for entry: ${entry.name}`);
}

function quotePowerShellLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function findPgDumpOnWindows(): string | null {
  const commonDirs = [
    'C:\\Program Files\\PostgreSQL',
    'C:\\Program Files (x86)\\PostgreSQL',
    'C:\\Program Files\\pgAdmin 4',
    'C:\\Program Files (x86)\\pgAdmin 4'
  ];

  for (const baseDir of commonDirs) {
    if (!existsSync(baseDir)) continue;
    try {
      // Check direct pg_dump in baseDir/runtime
      const runtimePath = resolve(baseDir, 'runtime', 'pg_dump.exe');
      if (existsSync(runtimePath)) return runtimePath;

      // Check subdirectories (like version numbers 12, 13, 14, 15, 16, 17, etc., or v4, v5, etc.)
      const subDirs = readdirSync(baseDir);
      for (const subDir of subDirs) {
        const binPath = resolve(baseDir, subDir, 'bin', 'pg_dump.exe');
        if (existsSync(binPath)) return binPath;

        const runtimeSubPath = resolve(baseDir, subDir, 'runtime', 'pg_dump.exe');
        if (existsSync(runtimeSubPath)) return runtimeSubPath;
      }
    } catch (e) {
      // Ignore errors for unreadable directories
    }
  }
  return null;
}

function findPsqlOnWindows(): string | null {
  const commonDirs = [
    'C:\\Program Files\\PostgreSQL',
    'C:\\Program Files (x86)\\PostgreSQL',
    'C:\\Program Files\\pgAdmin 4',
    'C:\\Program Files (x86)\\pgAdmin 4'
  ];

  for (const baseDir of commonDirs) {
    if (!existsSync(baseDir)) continue;
    try {
      const runtimePath = resolve(baseDir, 'runtime', 'psql.exe');
      if (existsSync(runtimePath)) return runtimePath;

      const subDirs = readdirSync(baseDir);
      for (const subDir of subDirs) {
        const binPath = resolve(baseDir, subDir, 'bin', 'psql.exe');
        if (existsSync(binPath)) return binPath;

        const runtimeSubPath = resolve(baseDir, subDir, 'runtime', 'psql.exe');
        if (existsSync(runtimeSubPath)) return runtimeSubPath;
      }
    } catch (e) {
      // Ignore
    }
  }
  return null;
}


function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    if (inString) {
      current += char;
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === "'") {
        if (sql[i + 1] === "'") {
          current += "'";
          i++;
        } else {
          inString = false;
        }
      }
    } else {
      if (char === "'") {
        inString = true;
        current += char;
      } else if (char === ';') {
        const stmt = current.trim();
        if (stmt) {
          statements.push(stmt);
        }
        current = '';
      } else {
        current += char;
      }
    }
  }

  const finalStmt = current.trim();
  if (finalStmt) {
    statements.push(finalStmt);
  }

  return statements;
}

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? 'TRUE' : 'FALSE';
  }
  if (typeof val === 'number') {
    return String(val);
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (Buffer.isBuffer(val)) {
    return `decode('${val.toString('hex')}', 'hex')`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function buildInsertsForModel(tableName: string, records: any[], colMap: Record<string, string> = {}): string {
  if (records.length === 0) return '';

  let sql = `-- Data for ${tableName}\n`;
  for (const record of records) {
    const columns: string[] = [];
    const values: string[] = [];

    for (const [key, value] of Object.entries(record)) {
      if (
        key === 'Student' ||
        key === 'User' ||
        key === 'Author' ||
        key === 'Role' ||
        key === 'ChangedBy' ||
        key === 'previous' ||
        key === 'nextVersions' ||
        key === 'AcademicYear' ||
        key === 'Document' ||
        key === 'Guardian' ||
        key === 'Timeline' ||
        key === 'StatusHistory' ||
        key === 'Notes' ||
        key === 'students' ||
        key === 'User_ActivityLogToactorUserId' ||
        key === 'ActivityLog' ||
        key === 'RefreshToken'
      ) {
        continue;
      }

      const dbColName = colMap[key] || key;
      columns.push(`"${dbColName}"`);
      values.push(escapeSqlValue(value));
    }

    sql += `INSERT INTO "${tableName}" (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
  }
  return sql + '\n';
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly prisma: PrismaService) {
    if (!existsSync(BACKUPS_DIR)) {
      mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    if (!existsSync(BACKUP_STAGING_DIR)) {
      mkdirSync(BACKUP_STAGING_DIR, { recursive: true });
    }
  }

  async assertRestoreApiEnabled(actorUserId?: string, target?: string): Promise<boolean> {
    if (isRestoreApiEnabled()) {
      return true;
    }

    const suffix = target ? ` (target: ${target})` : '';
    this.logger.warn(
      `[Backup] Blocked restore API attempt by actor ${actorUserId ?? 'unknown'}${suffix} because ALLOW_BACKUP_RESTORE is disabled.`,
    );

    if (actorUserId) {
      await this.auditLog(
        actorUserId,
        'BACKUP_RESTORE_BLOCKED',
        target ?? 'restore',
        `Blocked restore API attempt while ALLOW_BACKUP_RESTORE=false${suffix}`,
      );
    }

    return false;
  }

  private inspectBackupArchiveBuffer(buffer: Buffer): ZipEntryInfo[] {
    const entries = parseZipEntries(buffer);
    if (entries.length === 0) {
      throw new BadRequestException('Backup archive is empty');
    }

    const maxEntries = getMaxRestoreEntries();
    if (entries.length > maxEntries) {
      throw new BadRequestException(`Backup archive contains too many entries (${entries.length}/${maxEntries})`);
    }

    const seenEntries = new Set<string>();
    let totalUncompressedSize = 0;

    for (const entry of entries) {
      validateZipEntryName(entry.name);

      if (!isAllowedBackupEntry(entry.name)) {
        throw new BadRequestException(`Backup archive contains a forbidden entry: ${entry.name}`);
      }

      if (seenEntries.has(entry.name)) {
        throw new BadRequestException(`Backup archive contains a duplicate entry: ${entry.name}`);
      }
      seenEntries.add(entry.name);

      totalUncompressedSize += entry.uncompressedSize;
      if (totalUncompressedSize > getMaxUncompressedRestoreBytes()) {
        throw new BadRequestException('Backup archive exceeds the configured restore extraction limit');
      }
    }

    for (const requiredEntry of REQUIRED_BACKUP_ENTRIES) {
      if (!seenEntries.has(requiredEntry)) {
        throw new BadRequestException(`Backup archive is missing a required entry: ${requiredEntry}`);
      }
    }

    return entries;
  }

  private inspectBackupArchiveFile(filePath: string): { buffer: Buffer; entries: ZipEntryInfo[] } {
    const buffer = readFileSync(filePath);
    const entries = this.inspectBackupArchiveBuffer(buffer);
    return { buffer, entries };
  }

  private validateBackupMetadataBuffer(buffer: Buffer, entries: ZipEntryInfo[]): BackupMetadata {
    const metadataEntry = entries.find((entry) => entry.name === 'metadata.json');
    if (!metadataEntry) {
      throw new BadRequestException('Backup metadata.json is missing from the archive');
    }

    const metadataBuffer = extractZipEntryBuffer(buffer, metadataEntry);
    return parseBackupMetadata(metadataBuffer.toString('utf-8'));
  }

  private validateBackupManifestBuffer(buffer: Buffer, entries: ZipEntryInfo[]): BackupManifest {
    const manifestEntry = entries.find((entry) => entry.name === 'manifest.json');
    if (!manifestEntry) {
      throw new BadRequestException('Backup manifest.json is missing from the archive');
    }

    const manifestBuffer = extractZipEntryBuffer(buffer, manifestEntry);
    const manifest = parseBackupManifest(manifestBuffer.toString('utf-8'));

    const actualFileEntries = entries.filter(
      (entry) => !entry.isDirectory && entry.name !== 'manifest.json',
    );

    for (const entry of actualFileEntries) {
      const manifestItem = manifest.entries[entry.name];
      if (!manifestItem) {
        throw new BadRequestException(`Backup manifest is missing an entry for ${entry.name}`);
      }

      const payload = extractZipEntryBuffer(buffer, entry);
      const actualHash = hashBufferSha256(payload);
      if (manifestItem.sha256 !== actualHash) {
        throw new BadRequestException(`Backup checksum mismatch detected for ${entry.name}`);
      }
      if (manifestItem.size !== payload.length) {
        throw new BadRequestException(`Backup size mismatch detected for ${entry.name}`);
      }
    }

    for (const manifestName of Object.keys(manifest.entries)) {
      if (!actualFileEntries.find((entry) => entry.name === manifestName)) {
        throw new BadRequestException(`Backup manifest references a missing archive entry: ${manifestName}`);
      }
    }

    return manifest;
  }

  private ensureBackupArchiveIsSafe(filePath: string): void {
    const { buffer, entries } = this.inspectBackupArchiveFile(filePath);
    this.validateBackupMetadataBuffer(buffer, entries);
    this.validateBackupManifestBuffer(buffer, entries);
  }

  private createStagingDirectory(prefix: string): string {
    if (!existsSync(BACKUP_STAGING_DIR)) {
      mkdirSync(BACKUP_STAGING_DIR, { recursive: true });
    }
    return mkdtempSync(resolve(BACKUP_STAGING_DIR, `${prefix}-`));
  }

  private createSafeUploadedBackupName(originalName: string): string {
    const sanitized = basename(originalName).replace(/[^A-Za-z0-9._-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `uploaded-restore-${timestamp}-${sanitized}`;
  }

  private buildUploadsManifestEntries(dirPath: string, prefix = 'uploads'): Record<string, BackupManifestEntry> {
    const manifestEntries: Record<string, BackupManifestEntry> = {};
    if (!existsSync(dirPath)) {
      return manifestEntries;
    }

    const children = readdirSync(dirPath);
    for (const child of children) {
      const childPath = resolve(dirPath, child);
      const stats = statSync(childPath);
      const entryName = `${prefix}/${child}`.replace(/\\/g, '/');
      if (stats.isDirectory()) {
        Object.assign(manifestEntries, this.buildUploadsManifestEntries(childPath, entryName));
      } else {
        const payload = readFileSync(childPath);
        manifestEntries[entryName] = {
          sha256: hashBufferSha256(payload),
          size: payload.length,
        };
      }
    }

    return manifestEntries;
  }

  async generateSqlBackupViaPrisma(): Promise<string> {
    const roles = await this.prisma.role.findMany();
    const academicYears = await this.prisma.academicYear.findMany();
    const users = await this.prisma.user.findMany();
    const students = await this.prisma.student.findMany();
    const guardians = await this.prisma.guardian.findMany();
    const documents = await this.prisma.document.findMany();
    const activityLogs = await this.prisma.activityLog.findMany();
    const refreshTokens = await this.prisma.refreshToken.findMany();
    const studentTimelines = await this.prisma.studentTimeline.findMany();
    const studentStatusHistories = await this.prisma.studentStatusHistory.findMany();
    const studentNotes = await this.prisma.studentNote.findMany();
    const documentRequirements = await this.prisma.documentRequirement.findMany();
    const systemSettings = await this.prisma.systemSetting.findMany();
    const sequences = await this.prisma.sequence.findMany();
    const classes = await this.prisma.class.findMany();

    let sql = '';
    sql += '-- ARBAL Database Backup SQL (Generated via Prisma Client fallback)\n';
    sql += `-- Generated At: ${new Date().toISOString()}\n\n`;

    // Disable all triggers to avoid foreign key violations and constraint checks during insertion
    sql += 'SET session_replication_role = \'replica\';\n\n';

    // Truncate tables in cascade order to start fresh
    const tables = [
      'StudentNote',
      'StudentStatusHistory',
      'StudentTimeline',
      'RefreshToken',
      'ActivityLog',
      'Document',
      'Guardian',
      'Student',
      'User',
      'AcademicYear',
      'Role',
      'DocumentRequirement',
      'SystemSetting',
      'Sequence',
      'Class',
    ];

    for (const table of tables) {
      sql += `TRUNCATE TABLE "${table}" CASCADE;\n`;
    }
    sql += '\n';

    // Build SQL INSERT statements
    sql += buildInsertsForModel('Role', roles);
    sql += buildInsertsForModel('AcademicYear', academicYears);
    sql += buildInsertsForModel('User', users);
    sql += buildInsertsForModel('Student', students);
    sql += buildInsertsForModel('Guardian', guardians);
    sql += buildInsertsForModel('Document', documents, {
      verificationNotes: 'verification_notes',
      verifiedBy: 'verified_by',
      verifiedAt: 'verified_at',
    });
    sql += buildInsertsForModel('ActivityLog', activityLogs);
    sql += buildInsertsForModel('RefreshToken', refreshTokens);
    sql += buildInsertsForModel('StudentTimeline', studentTimelines);
    sql += buildInsertsForModel('StudentStatusHistory', studentStatusHistories);
    sql += buildInsertsForModel('StudentNote', studentNotes);
    sql += buildInsertsForModel('DocumentRequirement', documentRequirements);
    sql += buildInsertsForModel('SystemSetting', systemSettings);
    sql += buildInsertsForModel('Sequence', sequences);
    sql += buildInsertsForModel('Class', classes);

    // Re-enable triggers and constraints
    sql += 'SET session_replication_role = \'origin\';\n';

    return sql;
  }

  /**
   * Backup automatique Daily — chaque jour à 01:00 WIB (18:00 UTC)
   */
  @Cron('0 1 * * *', { timeZone: 'Asia/Jakarta' })
  async scheduledDailyBackup() {
    this.logger.log('Démarrage du backup automatique Daily...');
    try {
      const actorId = 'SYSTEM';
      const result = await this.createBackup(actorId, 'daily');
      this.logger.log(`Backup automatique Daily terminé : ${result.fileName}`);
      await this.cleanupOldBackups();
    } catch (err: any) {
      this.logger.error(`Échec du backup automatique Daily: ${err.message}`, err.stack);
      await this.auditLog('SYSTEM', 'BACKUP_FAILED', 'daily', `[CRON] Scheduled Daily backup failed: ${err.message}`);
    }
  }

  /**
   * Backup automatique Weekly — chaque dimanche à 02:00 WIB
   */
  @Cron('0 2 * * 0', { timeZone: 'Asia/Jakarta' })
  async scheduledWeeklyBackup() {
    this.logger.log('Démarrage du backup automatique Weekly...');
    try {
      const actorId = 'SYSTEM';
      const result = await this.createBackup(actorId, 'weekly');
      this.logger.log(`Backup automatique Weekly terminé : ${result.fileName}`);
      await this.cleanupOldBackups();
    } catch (err: any) {
      this.logger.error(`Échec du backup automatique Weekly: ${err.message}`, err.stack);
      await this.auditLog('SYSTEM', 'BACKUP_FAILED', 'weekly', `[CRON] Scheduled Weekly backup failed: ${err.message}`);
    }
  }

  /**
   * Backup automatique Monthly — le 1er du mois à 03:00 WIB
   */
  @Cron('0 3 1 * *', { timeZone: 'Asia/Jakarta' })
  async scheduledMonthlyBackup() {
    this.logger.log('Démarrage du backup automatique Monthly...');
    try {
      const actorId = 'SYSTEM';
      const result = await this.createBackup(actorId, 'monthly');
      this.logger.log(`Backup automatique Monthly terminé : ${result.fileName}`);
      await this.cleanupOldBackups();
    } catch (err: any) {
      this.logger.error(`Échec du backup automatique Monthly: ${err.message}`, err.stack);
      await this.auditLog('SYSTEM', 'BACKUP_FAILED', 'monthly', `[CRON] Scheduled Monthly backup failed: ${err.message}`);
    }
  }

  /**
   * Vérification automatique des backups — chaque dimanche à 04:00 WIB
   */
  @Cron('0 4 * * 0', { timeZone: 'Asia/Jakarta' })
  async verifyLatestBackupsCron() {
    this.logger.log('Démarrage de la vérification automatique des backups...');
    try {
      const result = this.listBackups();
      if (result.backups.length === 0) {
        this.logger.log('Aucun backup trouvé pour la vérification.');
        return;
      }

      // Vérifier les 3 derniers backups
      const latestBackups = result.backups.slice(0, 3);
      for (const b of latestBackups) {
        const isValid = await this.verifyBackupFile(b.fileName);
        if (!isValid) {
          this.logger.error(`Le fichier de backup ${b.fileName} est corrompu ou incomplet !`);
          await this.auditLog(
            'SYSTEM',
            'BACKUP_CORRUPTED',
            b.fileName,
            `[SYSTEM] Backup file verification failed: database.sql, metadata.json, or README.txt is missing in ZIP.`,
          );
        } else {
          this.logger.log(`Le fichier de backup ${b.fileName} est valide dan sain.`);
        }
      }
    } catch (err: any) {
      this.logger.error(`Échec de la vérification des backups: ${err.message}`, err.stack);
    }
  }

  async verifyBackupFile(fileName: string): Promise<boolean> {
    const filePath = this.getBackupFilePath(fileName);
    if (!existsSync(filePath)) return false;

    try {
      this.ensureBackupArchiveIsSafe(filePath);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to verify backup ${fileName}: ${err.message}`);
      return false;
    }
  }

  /**
   * Crée un backup complet : pg_dump SQL + répertoire uploads/ → ZIP
   */
  async createBackup(
    actorUserId?: string,
    tag: 'daily' | 'weekly' | 'monthly' | 'manual' = 'manual',
  ): Promise<{ fileName: string; filePath: string; sizeBytes: number; driveFileId: string | null }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      this.logger.error('[Backup] DATABASE_URL is not configured in process.env');
      throw new InternalServerErrorException('DATABASE_URL is not configured');
    }
    const fileName = `arbal-backup-${tag}-${timestamp}.zip`;
    const filePath = resolve(BACKUPS_DIR, fileName);

    this.logger.log('[Backup] Starting backup process...');

    // Step 1: Create backup directory
    this.logger.log(`[Backup] Step 1/7: Verifying or creating backup directory at: ${BACKUPS_DIR}`);
    try {
      if (!existsSync(BACKUPS_DIR)) {
        mkdirSync(BACKUPS_DIR, { recursive: true });
        this.logger.log(`[Backup] Created backups directory at: ${BACKUPS_DIR}`);
      }
    } catch (dirError: any) {
      this.logger.error(`[Backup] Failed to create backup directory: ${dirError.message}`, dirError.stack);
      throw new InternalServerErrorException(`Failed to initialize backups storage folder: ${dirError.message}`);
    }

    // Query stats dynamically from database
    let totalStudents = 0;
    let totalDocuments = 0;
    try {
      totalStudents = await this.prisma.student.count({ where: { deletedAt: null } });
      totalDocuments = await this.prisma.document.count({ where: { deletedAt: null } });
    } catch (err: any) {
      this.logger.warn(`[Backup] Failed to count students/documents for metadata: ${err.message}`, err.stack);
    }

    // Step 2: Prepare README template
    this.logger.log('[Backup] Step 2/7: Preparing backup metadata payload...');
    const readmeString = `PKBM TEKNOLOGI MUSTAQBAL - ARBAL BACKUP SYSTEM
==============================================
Berkas cadangan (backup) ini dibuat secara otomatis atau manual oleh sistem ARBAL.

Dibuat pada : ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB (Local Time)
Kategori    : ${tag.toUpperCase()}
Status Data :
- Total Siswa    : ${totalStudents}
- Total Dokumen  : ${totalDocuments}

Isi berkas ZIP:
- database.sql   : PostgreSQL database dump (schema & data)
- uploads/       : Folder penyimpanan berkas digital (KK, Akta, Ijazah, Rapor, Pas Foto, dll)
- metadata.json  : Metadata informasi teknis cadangan data
- README.txt     : Panduan informasi berkas ini

CARA PEMULIHAN (RESTORE):
Hubungi System Administrator / Staff IT PKBM Teknologi Mustaqbal.
Gunakan utilitas CLI pg_restore/psql untuk memulihkan database.sql, dan salin/ekstrak folder uploads ke lokasi root server ARBAL.
`;

    // Step 4: Execute pg_dump
    this.logger.log('[Backup] Step 4/7: Locating pg_dump executable and executing PostgreSQL dump...');
    let pgDumpExecutable = 'pg_dump';
    if (process.env.PG_DUMP_PATH) {
      pgDumpExecutable = process.env.PG_DUMP_PATH;
      this.logger.log(`[Backup] Using pg_dump path configured in environment: "${pgDumpExecutable}"`);
    } else if (process.platform === 'win32') {
      const foundPath = findPgDumpOnWindows();
      if (foundPath) {
        pgDumpExecutable = foundPath;
        this.logger.log(`[Backup] Auto-detected pg_dump path on Windows: "${pgDumpExecutable}"`);
      } else {
        this.logger.warn('[Backup] pg_dump executable not found in common Windows directories. Will try calling "pg_dump" from PATH.');
      }
    }

    let sqlDump: string;
    let sqlDumpSource: 'pg_dump' | 'prisma-fallback' = 'pg_dump';
    try {
      this.logger.log(`[Backup] Spawning pg_dump process: "${pgDumpExecutable}"`);
      const result = await execFileAsync(pgDumpExecutable, ['-d', dbUrl, '--no-owner', '--no-acl'], {
        maxBuffer: 50 * 1024 * 1024, // 50 MB buffer
        env: { ...process.env, PGPASSWORD: undefined }, // pg_dump lira depuis l'URL
      });
      sqlDump = result.stdout;
      if (result.stderr) this.logger.warn(`[Backup] pg_dump stderr: ${result.stderr}`);
      this.logger.log('[Backup] pg_dump execution completed successfully.');
    } catch (pgError: any) {
      this.logger.warn(`[Backup] pg_dump execution failed: ${pgError.message}. Falling back to programmatic database dump via Prisma Client...`);
      try {
        sqlDump = await this.generateSqlBackupViaPrisma();
        sqlDumpSource = 'prisma-fallback';
        this.logger.log('[Backup] Programmatic database dump fallback completed successfully.');
      } catch (fallbackError: any) {
        this.logger.error(`[Backup] Programmatic database dump fallback failed: ${fallbackError.message}`, fallbackError.stack);
        throw new InternalServerErrorException(
          `Database backup failed: pg_dump client tools are not installed or failed to execute (${pgError.message}), ` +
          `and the programmatic database dump fallback also failed: ${fallbackError.message}.`
        );
      }
    }

    // Step 3: Generate metadata.json after dump source is known
    this.logger.log('[Backup] Step 3/7: Generating metadata.json...');
    const metadata: BackupMetadata = {
      version: '2.0.0',
      created_at: new Date().toISOString(),
      total_students: totalStudents,
      total_documents: totalDocuments,
      database: 'postgresql',
      tag,
      backup_format: 'zip+plain-sql',
      sql_dump_source: sqlDumpSource,
      generator_version: '1.0.0',
    };
    const metadataString = JSON.stringify(metadata, null, 2);

    const manifest: BackupManifest = {
      version: '1.0.0',
      algorithm: 'sha256',
      generated_at: new Date().toISOString(),
      entries: {
        'database.sql': {
          sha256: hashBufferSha256(Buffer.from(sqlDump, 'utf-8')),
          size: Buffer.byteLength(sqlDump, 'utf-8'),
        },
        'metadata.json': {
          sha256: hashBufferSha256(Buffer.from(metadataString, 'utf-8')),
          size: Buffer.byteLength(metadataString, 'utf-8'),
        },
        'README.txt': {
          sha256: hashBufferSha256(Buffer.from(readmeString, 'utf-8')),
          size: Buffer.byteLength(readmeString, 'utf-8'),
        },
        ...this.buildUploadsManifestEntries(UPLOADS_DIR),
      },
    };
    const manifestString = JSON.stringify(manifest, null, 2);

    // Step 4 & 5: Zip uploads and write zip file
    this.logger.log('[Backup] Step 4/7: Preparing ZIP archive file...');
    this.logger.log(`[Backup] Step 5/7: Streaming and writing ZIP file to: ${filePath}`);
    try {
      const output = createWriteStream(filePath);
      const archive = new ZipArchive({ zlib: { level: 9 } });

      await new Promise<void>((resolvePromise, reject) => {
        output.on('close', () => {
          this.logger.log('[Backup] ZIP file stream closed successfully.');
          resolvePromise();
        });
        output.on('error', (err) => {
          this.logger.error(`[Backup] Write stream error: ${err.message}`, err.stack);
          reject(err);
        });
        archive.on('error', (err) => {
          this.logger.error(`[Backup] Archiver error: ${err.message}`, err.stack);
          reject(err);
        });

        archive.pipe(output);

        // Ajouter le dump SQL
        archive.append(sqlDump, { name: 'database.sql' });

        // Ajouter metadata.json
        archive.append(metadataString, { name: 'metadata.json' });

        // Ajouter README.txt
        archive.append(readmeString, { name: 'README.txt' });

        // Ajouter manifest.json
        archive.append(manifestString, { name: 'manifest.json' });

        // Ajouter le répertoire uploads/ (s'il existe)
        if (existsSync(UPLOADS_DIR)) {
          this.logger.log(`[Backup] Packing uploads directory into ZIP: ${UPLOADS_DIR}`);
          archive.directory(UPLOADS_DIR, 'uploads');
        } else {
          this.logger.log('[Backup] Uploads directory does not exist. Skipping uploads packing.');
        }

        archive.finalize();
      });
    } catch (zipError: any) {
      this.logger.error(`[Backup] Zipping process failed: ${zipError.message}`, zipError.stack);
      // Clean up incomplete zip file if written
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (cleanupErr: any) {
        this.logger.warn(`[Backup] Failed to delete incomplete ZIP file: ${cleanupErr.message}`);
      }
      throw new InternalServerErrorException(`Failed to package backup archive: ${zipError.message}`);
    }

    const sizeBytes = statSync(filePath).size;
    this.logger.log(`[Backup] Backup file written successfully: ${fileName} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`);

    const driveFileId = null;

    // Step 6: Save backup record
    this.logger.log('[Backup] Step 6/7: Creating audit log and database record for the backup operation...');
    if (actorUserId) {
      await this.auditLog(actorUserId, 'BACKUP_CREATE', fileName, `Backup created: ${fileName} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB). Contains ${totalStudents} students and ${totalDocuments} documents.`);
    }

    return { fileName, filePath, sizeBytes, driveFileId };
  }

  private async cleanupOldBackups() {
    if (!existsSync(BACKUPS_DIR)) return;

    // 1. Delete backups older than dynamic retention days
    const retentionDays = getRetentionDays();
    const ninetyDaysAgoMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const allFiles = readdirSync(BACKUPS_DIR)
      .filter(f => BACKUP_FILE_PATTERN.test(f))
      .map(f => ({ name: f, time: statSync(resolveBackupFile(f)).mtimeMs }));

    for (const file of allFiles) {
      if (file.time < ninetyDaysAgoMs) {
        try {
          unlinkSync(resolveBackupFile(file.name));
          this.logger.log(`Auto-deleted backup older than ${retentionDays} days: ${file.name}`);
          await this.auditLog('SYSTEM', 'BACKUP_AUTO_DELETE', file.name, `[SYSTEM] Automatic deletion of backup file older than ${retentionDays} days: ${file.name}`);
        } catch (err: any) {
          this.logger.error(`Failed to auto-delete old backup ${file.name}: ${err.message}`);
        }
      }
    }

    // 2. Enforce MAX_BACKUPS limit
    const maxBackups = getMaxBackups();
    const remainingFiles = readdirSync(BACKUPS_DIR)
      .filter(f => BACKUP_FILE_PATTERN.test(f))
      .map(f => ({ name: f, time: statSync(resolveBackupFile(f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    for (let i = maxBackups; i < remainingFiles.length; i++) {
      const fileName = remainingFiles[i].name;
      try {
        unlinkSync(resolveBackupFile(fileName));
        this.logger.log(`Auto-deleted backup exceeding retention limit: ${fileName}`);
        await this.auditLog('SYSTEM', 'BACKUP_AUTO_DELETE', fileName, `[SYSTEM] Automatic deletion of backup file exceeding retention limit of ${maxBackups}: ${fileName}`);
      } catch (err: any) {
        this.logger.error(`Failed to auto-delete limit-exceeding backup ${fileName}: ${err.message}`);
      }
    }
  }

  /**
   * Get the absolute path of a backup file by its filename.
   */
  getBackupFilePath(fileName: string): string {
    return resolveBackupFile(fileName);
  }

  private getDirSize(dirPath: string): number {
    let size = 0;
    if (!existsSync(dirPath)) return 0;
    try {
      const files = readdirSync(dirPath);
      for (const file of files) {
        const filePath = resolve(dirPath, file);
        const stats = statSync(filePath);
        if (stats.isDirectory()) {
          size += this.getDirSize(filePath);
        } else {
          size += stats.size;
        }
      }
    } catch {
      // Ignore errors
    }
    return size;
  }

  private getDirFileCount(dirPath: string): number {
    let count = 0;
    if (!existsSync(dirPath)) return 0;
    try {
      const files = readdirSync(dirPath);
      for (const file of files) {
        const filePath = resolve(dirPath, file);
        const stats = statSync(filePath);
        if (stats.isDirectory()) {
          count += this.getDirFileCount(filePath);
        } else {
          count += 1;
        }
      }
    } catch {
      // Ignore errors
    }
    return count;
  }

  private restoreUploadsWithRollback(uploadsBackupPath: string): void {
    const operationDir = this.createStagingDirectory('restore-uploads');
    ensureInsideDirectory(BACKUP_STAGING_DIR, operationDir);

    const candidateDir = resolve(operationDir, 'candidate-uploads');
    const rollbackDir = resolve(operationDir, 'rollback-uploads');
    ensureInsideDirectory(operationDir, candidateDir);
    ensureInsideDirectory(operationDir, rollbackDir);

    const hadExistingUploads = existsSync(UPLOADS_DIR);
    const previousSizeBytes = hadExistingUploads ? this.getDirSize(UPLOADS_DIR) : 0;
    const previousFileCount = hadExistingUploads ? this.getDirFileCount(UPLOADS_DIR) : 0;
    const candidateSizeBytes = this.getDirSize(uploadsBackupPath);
    const candidateFileCount = this.getDirFileCount(uploadsBackupPath);

    let liveUploadsReplaced = false;

    try {
      this.logger.log(
        `[Backup] Preparing uploads restore candidate: ${candidateFileCount} files, ${(candidateSizeBytes / 1024 / 1024).toFixed(2)} MB`,
      );
      cpSync(uploadsBackupPath, candidateDir, { recursive: true });

      if (hadExistingUploads) {
        this.logger.log(
          `[Backup] Snapshotting current uploads for rollback: ${previousFileCount} files, ${(previousSizeBytes / 1024 / 1024).toFixed(2)} MB`,
        );
        cpSync(UPLOADS_DIR, rollbackDir, { recursive: true });
      }

      rmSync(UPLOADS_DIR, { recursive: true, force: true });
      cpSync(candidateDir, UPLOADS_DIR, { recursive: true });
      liveUploadsReplaced = true;

      const restoredSizeBytes = this.getDirSize(UPLOADS_DIR);
      const restoredFileCount = this.getDirFileCount(UPLOADS_DIR);
      this.logger.log(
        `[Backup] Uploads restore completed: ${restoredFileCount} files, ${(restoredSizeBytes / 1024 / 1024).toFixed(2)} MB`,
      );
    } catch (restoreError: any) {
      this.logger.error(`[Backup] Uploads restore failed: ${restoreError.message}`, restoreError.stack);

      try {
        rmSync(UPLOADS_DIR, { recursive: true, force: true });
        if (hadExistingUploads && existsSync(rollbackDir)) {
          cpSync(rollbackDir, UPLOADS_DIR, { recursive: true });
          this.logger.warn('[Backup] Uploads rollback completed from snapshot.');
        } else if (!hadExistingUploads) {
          mkdirSync(UPLOADS_DIR, { recursive: true });
          this.logger.warn('[Backup] Uploads rollback restored empty directory state.');
        }
      } catch (rollbackError: any) {
        this.logger.error(
          `[Backup] Uploads rollback failed after restore error: ${rollbackError.message}`,
          rollbackError.stack,
        );
        throw new InternalServerErrorException(
          `Uploads restore failed and rollback also failed: ${rollbackError.message}`,
        );
      }

      throw new InternalServerErrorException(
        `Uploads restore failed after database restore completed: ${restoreError.message}`,
      );
    } finally {
      rmSync(operationDir, { recursive: true, force: true });
      if (!liveUploadsReplaced && !hadExistingUploads && !existsSync(UPLOADS_DIR)) {
        mkdirSync(UPLOADS_DIR, { recursive: true });
      }
    }
  }

  /**
   * Liste tous les backups disponibles
   */
  listBackups() {
    if (!existsSync(BACKUPS_DIR)) {
      return { 
        backups: [], 
        lastBackupAt: null, 
        totalSizeMB: 0,
        uploadsSizeMB: 0,
        backupsSizeMB: 0,
        freeSpaceBytes: 0
      };
    }

    const backups = readdirSync(BACKUPS_DIR)
      .filter(f => BACKUP_FILE_PATTERN.test(f))
      .map(f => {
        const stats = statSync(resolveBackupFile(f));
        return {
          fileName: f,
          sizeBytes: stats.size,
          sizeMB: parseFloat((stats.size / 1024 / 1024).toFixed(2)),
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const lastBackupAt = backups.length > 0 ? backups[0].createdAt : null;
    const totalSizeMB = parseFloat(
      backups.reduce((acc, b) => acc + b.sizeMB, 0).toFixed(2)
    );

    const uploadsSize = this.getDirSize(UPLOADS_DIR);
    const backupsSize = this.getDirSize(BACKUPS_DIR);

    let freeSpaceBytes = 0;
    try {
      const { statfsSync } = require('fs');
      const stats = statfsSync(BACKUPS_DIR);
      freeSpaceBytes = stats.bavail * stats.bsize;
    } catch {
      // Fallback
    }

    return {
      backups,
      lastBackupAt,
      totalSizeMB,
      uploadsSizeMB: parseFloat((uploadsSize / 1024 / 1024).toFixed(2)),
      backupsSizeMB: parseFloat((backupsSize / 1024 / 1024).toFixed(2)),
      freeSpaceBytes,
    };
  }

  /**
   * Restore from a backup ZIP file.
   * WARNING: This will REPLACE the current database and uploads.
   * Steps:
   *   1. Unzip backup to temp directory
   *   2. Run psql to restore database from database.sql
   *   3. Restore uploads/ directory
   *   4. Cleanup temp files
   */
  async restoreFromBackup(fileName: string, actorUserId?: string, reason?: string): Promise<{ message: string; restored: string }> {
    const filePath = resolveBackupFile(fileName);
    const normalizedReason = normalizeRestoreReason(reason);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Backup file not found: ${fileName}`);
    }
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not configured');

    const extractDir = resolve(BACKUPS_DIR, `restore-${Date.now()}`);
    ensureInsideDirectory(BACKUPS_DIR, extractDir);

    try {
      this.ensureBackupArchiveIsSafe(filePath);

      // Pre-restore guard: check available disk space
      const backupSizeBytes = statSync(filePath).size;
      const estimatedExtractBytes = backupSizeBytes * 3;
      try {
        const { statfsSync } = require('fs');
        const fsStats = statfsSync(BACKUPS_DIR);
        const freeSpaceBytes = fsStats.bavail * fsStats.bsize;
        if (freeSpaceBytes < estimatedExtractBytes) {
          throw new BadRequestException(
            `Ruang disk tidak cukup untuk restore. Dibutuhkan minimal ${(estimatedExtractBytes / 1024 / 1024).toFixed(0)} MB, tersedia ${(freeSpaceBytes / 1024 / 1024).toFixed(0)} MB.`,
          );
        }
        this.logger.log(`[Restore] Disk space check passed: ${(freeSpaceBytes / 1024 / 1024).toFixed(0)} MB available, ~${(estimatedExtractBytes / 1024 / 1024).toFixed(0)} MB needed.`);
      } catch (spaceErr: any) {
        if (spaceErr instanceof BadRequestException) throw spaceErr;
        this.logger.warn(`[Restore] Disk space check skipped: ${spaceErr.message}`);
      }

      // 1. Extract ZIP
      this.logger.log(`Extracting backup: ${fileName}`);
      mkdirSync(extractDir, { recursive: true });

      // Use PowerShell Expand-Archive on Windows, unzip on Linux
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        await execFileAsync(
          'powershell',
          [
            '-NoProfile',
            '-Command',
            `Expand-Archive -LiteralPath ${quotePowerShellLiteral(filePath)} -DestinationPath ${quotePowerShellLiteral(extractDir)} -Force`,
          ],
          { maxBuffer: 100 * 1024 * 1024 },
        );
      } else {
        await execFileAsync('unzip', ['-o', filePath, '-d', extractDir], {
          maxBuffer: 100 * 1024 * 1024,
        });
      }

      const sqlPath = resolve(extractDir, 'database.sql');
      ensureInsideDirectory(extractDir, sqlPath);
      if (!existsSync(sqlPath)) {
        throw new Error('Backup archive does not contain database.sql');
      }

      const metadataPath = resolve(extractDir, 'metadata.json');
      ensureInsideDirectory(extractDir, metadataPath);
      if (!existsSync(metadataPath)) {
        throw new Error('Backup archive does not contain metadata.json');
      }
      const metadata = parseBackupMetadata(readFileSync(metadataPath, 'utf-8'));
      this.logger.log(
        `Validated backup metadata: version=${metadata.version ?? 'unknown'}, format=${metadata.backup_format ?? 'legacy'}, source=${metadata.sql_dump_source ?? 'unknown'}`,
      );

      // Pre-restore guard: validate backup format version compatibility
      const SUPPORTED_BACKUP_VERSIONS = ['2.0.0'];
      if (metadata.version && !SUPPORTED_BACKUP_VERSIONS.includes(metadata.version)) {
        throw new BadRequestException(
          `Versi backup tidak didukung: ${metadata.version}. Versi yang didukung: ${SUPPORTED_BACKUP_VERSIONS.join(', ')}.`,
        );
      }
      if (metadata.database && metadata.database !== 'postgresql') {
        throw new BadRequestException(
          `Tipe database backup tidak didukung: ${metadata.database}. Hanya PostgreSQL yang didukung.`,
        );
      }

      // 2. Restore database
      this.logger.log('Restoring database from SQL dump...');
      let psqlExecutable = process.env.PSQL_PATH || 'psql';
      if (process.platform === 'win32' && psqlExecutable === 'psql') {
        const detectedPath = findPsqlOnWindows();
        if (detectedPath) {
          psqlExecutable = detectedPath;
          this.logger.log(`Auto-detected psql path on Windows: "${psqlExecutable}"`);
        } else {
          this.logger.warn('psql executable not found in common Windows directories. Will try calling "psql" from PATH.');
        }
      }

      const psqlArgs = ['-v', 'ON_ERROR_STOP=1', '-1', '-d', dbUrl, '-f', sqlPath];
      try {
        this.logger.log(`Attempting atomic database restore via psql executable: "${psqlExecutable}"`);
        const result = await execFileAsync(psqlExecutable, psqlArgs, {
          maxBuffer: 100 * 1024 * 1024,
          env: { ...process.env, PGPASSWORD: undefined },
        });
        if (result.stderr) {
          this.logger.warn(`[Backup] psql restore stderr: ${result.stderr}`);
        }
        this.logger.log('psql restore completed successfully with ON_ERROR_STOP and single transaction.');
      } catch (psqlError: any) {
        const stderr = (psqlError?.stderr || '').toString().trim();
        const detail = stderr ? ` ${stderr.slice(0, 400)}` : '';
        throw new InternalServerErrorException(
          `Database restore failed atomically via psql.${detail} Programmatic restore fallback has been disabled for safety.`,
        );
      }

      // 3. Restore uploads directory if present
      const uploadsBackupPath = resolve(extractDir, 'uploads');
      ensureInsideDirectory(extractDir, uploadsBackupPath);
      if (existsSync(uploadsBackupPath)) {
        this.logger.log('Restoring uploads directory with rollback protection...');
        this.restoreUploadsWithRollback(uploadsBackupPath);
      }

      this.logger.log(`Restore complete: ${fileName}`);

      // Audit log
      if (actorUserId) {
        await this.auditLog(
          actorUserId,
          'BACKUP_RESTORE',
          fileName,
          `Database and uploads restored from backup: ${fileName}. reason="${normalizedReason}"`,
        );
      }

      return {
        message: `Restore dari ${fileName} berhasil.`,
        restored: fileName,
      };
    } catch (err: any) {
      // Audit log for failed restore
      if (actorUserId) {
        const errorDetail = err?.message || 'Unknown error';
        await this.auditLog(
          actorUserId,
          'BACKUP_RESTORE_FAILED',
          fileName,
          `Restore gagal dari backup: ${fileName}. reason="${normalizedReason}". error="${errorDetail.slice(0, 500)}"`,
        ).catch(() => {});
      }
      throw err;
    } finally {
      // 4. Cleanup temp directory
      try {
        const { rmSync } = await import('fs');
        if (existsSync(extractDir)) {
          rmSync(extractDir, { recursive: true, force: true });
        }
      } catch (cleanupErr: any) {
        this.logger.warn(`Cleanup temp dir failed: ${cleanupErr.message}`);
      }
    }
  }

  async uploadAndRestoreBackup(file: Express.Multer.File, actorUserId: string, reason?: string): Promise<{ message: string; restored: string }> {
    const normalizedReason = normalizeRestoreReason(reason);
    const buffer = file.buffer;
    if (!buffer || buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      throw new BadRequestException('Format berkas harus ZIP cadangan valid');
    }

    if (!existsSync(BACKUPS_DIR)) {
      mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const fileName = basename(file.originalname);
    if (!fileName.toLowerCase().endsWith('.zip')) {
      throw new BadRequestException('Nama berkas harus berakhiran .zip');
    }

    this.inspectBackupArchiveBuffer(buffer);

    const stagingDir = this.createStagingDirectory('uploaded-restore');
    ensureInsideDirectory(BACKUP_STAGING_DIR, stagingDir);
    const stagedFilePath = resolve(stagingDir, fileName);
    ensureInsideDirectory(stagingDir, stagedFilePath);

    let promotedFileName: string | null = null;
    try {
      writeFileSync(stagedFilePath, buffer);
      this.logger.log(`[Backup] Uploaded backup staged at: ${stagedFilePath}`);

      this.ensureBackupArchiveIsSafe(stagedFilePath);

      promotedFileName = this.createSafeUploadedBackupName(fileName);
      const promotedFilePath = resolveBackupFile(promotedFileName);
      renameSync(stagedFilePath, promotedFilePath);
      this.logger.log(`[Backup] Uploaded backup promoted to official store: ${promotedFilePath}`);

      return this.restoreFromBackup(promotedFileName, actorUserId, normalizedReason);
    } finally {
      if (existsSync(stagingDir)) {
        rmSync(stagingDir, { recursive: true, force: true });
      }
    }
  }

  async deleteBackup(fileName: string, actorUserId?: string): Promise<{ message: string }> {
    const filePath = resolveBackupFile(fileName);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Backup file not found: ${fileName}`);
    }
    unlinkSync(filePath);
    this.logger.log(`Backup deleted: ${fileName}`);

    // Audit log
    if (actorUserId) {
      await this.auditLog(actorUserId, 'BACKUP_DELETE', fileName, `Backup file deleted: ${fileName}`);
    }

    return { message: `Backup ${fileName} berhasil dihapus` };
  }

  async logDownload(fileName: string, actorUserId: string): Promise<void> {
    await this.auditLog(
      actorUserId,
      'BACKUP_DOWNLOAD',
      fileName,
      `Backup file downloaded: ${fileName}`,
    );
  }

  /**
   * Internal helper: write a structured audit log entry for backup operations.
   */
  private async auditLog(actorUserId: string, action: string, fileName: string, details: string) {
    try {
      await this.prisma.activityLog.create({
        data: {
          id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          actorUserId,
          action,
          category: 'BACKUP',
          entityType: 'Backup',
          entityId: fileName,
          details,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to write audit log for ${action}: ${err.message}`);
    }
  }

  /**
   * Lightweight database-only backup triggered on data mutations.
   * Generates a SQL dump via Prisma (no uploads, no ZIP) and saves it
   * to backups/db-only/. Skips if the last db-only backup is < 30s old
   * to avoid flooding during batch operations.
   */
  async createDbOnlyBackup(reason?: string): Promise<void> {
    try {
      // Ensure directory exists
      if (!existsSync(DB_ONLY_BACKUPS_DIR)) {
        mkdirSync(DB_ONLY_BACKUPS_DIR, { recursive: true });
      }

      // Debounce: skip if the most recent db-only backup is less than 30 seconds old
      const existingFiles = readdirSync(DB_ONLY_BACKUPS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort()
        .reverse();

      if (existingFiles.length > 0) {
        const latestFile = resolve(DB_ONLY_BACKUPS_DIR, existingFiles[0]);
        const stat = statSync(latestFile);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs < 30_000) {
          this.logger.debug(`[DbOnlyBackup] Skipped — last backup was ${Math.round(ageMs / 1000)}s ago (debounce 30s)`);
          return;
        }
      }

      // Generate SQL dump
      const sqlDump = await this.generateSqlBackupViaPrisma();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `db-snapshot-${timestamp}.sql`;
      const filePath = resolve(DB_ONLY_BACKUPS_DIR, fileName);

      writeFileSync(filePath, sqlDump, 'utf-8');
      this.logger.log(`[DbOnlyBackup] Saved: ${fileName} (reason: ${reason || 'mutation'})`);

      // Cleanup: keep only the most recent MAX_DB_ONLY_BACKUPS files
      const allFiles = readdirSync(DB_ONLY_BACKUPS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort()
        .reverse();

      if (allFiles.length > MAX_DB_ONLY_BACKUPS) {
        const toDelete = allFiles.slice(MAX_DB_ONLY_BACKUPS);
        for (const old of toDelete) {
          try {
            unlinkSync(resolve(DB_ONLY_BACKUPS_DIR, old));
            this.logger.debug(`[DbOnlyBackup] Cleaned up old snapshot: ${old}`);
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      // Never let backup failures break the main operation
      this.logger.warn(`[DbOnlyBackup] Failed: ${err.message}`);
    }
  }
}
