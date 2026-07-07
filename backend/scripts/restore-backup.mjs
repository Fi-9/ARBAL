/**
 * ARBAL Database Restore Script
 * 
 * Usage: node scripts/restore-backup.mjs
 * 
 * Restores database from BACKUPS TEST/extracted_temp/database.sql
 * Handles pg_dump COPY format and foreign key constraints.
 */

import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
const envPath = resolve(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
      }
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_SQL_PATH = resolve(__dirname, '..', 'BACKUPS TEST', 'extracted_temp', 'database.sql');

function parseAllCopyBlocks(sqlContent) {
  const blocks = [];
  const lines = sqlContent.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const copyMatch = line.match(/^COPY public\."(\w+)"\s*\(([^)]+)\)\s*FROM stdin;/);
    if (copyMatch) {
      const tableName = copyMatch[1];
      const columns = copyMatch[2].split(',').map(c => c.trim().replace(/"/g, ''));
      const dataLines = [];
      i++;
      while (i < lines.length && lines[i] !== '\\.') {
        if (lines[i].trim()) dataLines.push(lines[i]);
        i++;
      }
      blocks.push({ tableName, columns, dataLines });
    }
    i++;
  }
  return blocks;
}

function parseLine(line, columns) {
  const values = line.split('\t');
  const obj = {};
  columns.forEach((col, idx) => {
    const val = values[idx];
    obj[col] = (val === '\\N' || val === undefined) ? null : val;
  });
  return obj;
}

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 10000 });

  try {
    console.log('Connecting to database...');
    await pool.query('SELECT 1');
    console.log('Connected!\n');

    const sqlContent = readFileSync(BACKUP_SQL_PATH, 'utf-8');
    const blocks = parseAllCopyBlocks(sqlContent);
    
    const rolesResult = await pool.query('SELECT id, name FROM "Role"');
    const roleMap = {};
    for (const row of rolesResult.rows) roleMap[row.name] = row.id;
    const superAdminRoleId = roleMap['SUPER_ADMIN'];
    const guruRoleId = roleMap['GURU'];

    // Create users
    console.log('─── Creating Users ───');
    await pool.query(`
      INSERT INTO "User" (id, name, email, "passwordHash", "isActive", "failedLoginAttempts", "roleId", "createdAt", "updatedAt")
      VALUES ('SYSTEM', 'SYSTEM', 'system@arbal.local', 'SYSTEM_LOCKED_ACCOUNT', false, 0, $1, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [superAdminRoleId]);
    console.log('  ✓ SYSTEM');

    const adminPassword = process.env.ADMIN_PASSWORD || 'changeme';
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await pool.query(`
      INSERT INTO "User" (id, name, email, "passwordHash", "isActive", "failedLoginAttempts", "roleId", "createdAt", "updatedAt")
      VALUES ('admin-user-default-id', 'Admin Mustaqbal', 'admin@mustaqbal.sch.id', $1, true, 0, $2, '2026-06-23 07:08:08.979', NOW())
      ON CONFLICT (id) DO NOTHING
    `, [passwordHash, superAdminRoleId]);
    console.log('  ✓ Admin Mustaqbal');

    await pool.query(`
      INSERT INTO "User" (id, name, email, "passwordHash", "isActive", "failedLoginAttempts", "roleId", "createdAt", "updatedAt")
      VALUES ('b8839858-935d-467f-8821-d9aec1d3eb77', 'Guru', 'guru@mustaqbal.sch.id', $1, true, 0, $2, '2026-06-23 09:30:12.976', '2026-06-23 09:30:12.976')
      ON CONFLICT (id) DO NOTHING
    `, [await bcrypt.hash(process.env.GURU_PASSWORD || 'changeme', 12), guruRoleId]);
    console.log('  ✓ Guru');

    // Restore AcademicYear
    console.log('\n─── Restoring AcademicYear ───');
    const ayBlock = blocks.find(b => b.tableName === 'AcademicYear');
    if (ayBlock) {
      for (const line of ayBlock.dataLines) {
        const v = parseLine(line, ayBlock.columns);
        await pool.query(`
          INSERT INTO "AcademicYear" (id, name, "isActive", "createdAt")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (name) DO UPDATE SET "isActive" = EXCLUDED."isActive"
        `, [v.id, v.name, v.isActive === 't', v.createdAt]);
        console.log(`  ✓ ${v.name}`);
      }
    }

    // Restore Sequence
    console.log('\n─── Restoring Sequence ───');
    const seqBlock = blocks.find(b => b.tableName === 'Sequence');
    if (seqBlock) {
      for (const line of seqBlock.dataLines) {
        const v = parseLine(line, seqBlock.columns);
        await pool.query(`
          INSERT INTO "Sequence" (id, value) VALUES ($1, $2)
          ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value
        `, [v.id, parseInt(v.value)]);
        console.log(`  ✓ ${v.id} = ${v.value}`);
      }
    }

    // Restore Students
    console.log('\n─── Restoring Students ───');
    const studentBlock = blocks.find(b => b.tableName === 'Student');
    if (studentBlock) {
      for (const line of studentBlock.dataLines) {
        const v = parseLine(line, studentBlock.columns);
        try {
          await pool.query(`
            INSERT INTO "Student" (id, "nisSekolah", nisn, "registrationNumber", angkatan, nama, kelas, jurusan, email, telepon, alamat, "tanggalLahir", status, catatan, "createdAt", "updatedAt", "deletedAt", "deletedBy", "graduationYear", "certificateNumber", "academicYearId", "anakKe", "asalSekolah", "jenisKelamin", "jumlahSaudara", "namaPanggilan", nik, "nomorKK", "photoUrl", "tahunLulusSebelumnya", "tempatLahir")
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
            ON CONFLICT (id) DO NOTHING
          `, [
            v.id, v.nisSekolah, v.nisn, v.registrationNumber, 
            v.angkatan ? parseInt(v.angkatan) : 0,
            v.nama, v.kelas, v.jurusan, 
            v.email || '-', v.telepon || '-', v.alamat || '-',
            v.tanggalLahir, v.status, v.catatan, v.createdAt, v.updatedAt,
            v.deletedAt, v.deletedBy, 
            v.graduationYear ? parseInt(v.graduationYear) : null,
            v.certificateNumber, v.academicYearId,
            v.anakKe ? parseInt(v.anakKe) : null,
            v.asalSekolah, v.jenisKelamin,
            v.jumlahSaudara ? parseInt(v.jumlahSaudara) : null,
            v.namaPanggilan, v.nik, v.nomorKK, v.photoUrl,
            v.tahunLulusSebelumnya ? parseInt(v.tahunLulusSebelumnya) : null,
            v.tempatLahir
          ]);
          console.log(`  ✓ ${v.nama} (${v.id})`);
        } catch (err) {
          console.log(`  ⚠ ${v.nama}: ${err.message.substring(0, 80)}`);
        }
      }
    }

    // Restore Guardians
    console.log('\n─── Restoring Guardians ───');
    const guardianBlock = blocks.find(b => b.tableName === 'Guardian');
    if (guardianBlock) {
      for (const line of guardianBlock.dataLines) {
        const v = parseLine(line, guardianBlock.columns);
        try {
          await pool.query(`
            INSERT INTO "Guardian" (id, "studentId", "namaAyah", "pekerjaanAyah", "ktpAyah", "teleponAyah", "namaIbu", "pekerjaanIbu", "ktpIbu", "teleponIbu", "teleponOrangTua", "alamatOrangTua", "deletedAt", "deletedBy", "alamatWali", "hubunganWali", "namaWali", "pendidikanAyah", "pendidikanIbu", "statusAyah", "statusIbu", "teleponWali")
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
            ON CONFLICT (id) DO NOTHING
          `, [
            v.id, v.studentId, v.namaAyah, v.pekerjaanAyah, v.ktpAyah, v.teleponAyah,
            v.namaIbu, v.pekerjaanIbu, v.ktpIbu, v.teleponIbu, v.teleponOrangTua,
            v.alamatOrangTua, v.deletedAt, v.deletedBy, v.alamatWali, v.hubunganWali,
            v.namaWali, v.pendidikanAyah, v.pendidikanIbu, v.statusAyah, v.statusIbu, v.teleponWali
          ]);
          console.log(`  ✓ Guardian for ${v.studentId}`);
        } catch (err) {
          console.log(`  ⚠ Guardian: ${err.message.substring(0, 80)}`);
        }
      }
    }

    // Restore Documents
    console.log('\n─── Restoring Documents ───');
    const docBlock = blocks.find(b => b.tableName === 'Document');
    if (docBlock) {
      for (const line of docBlock.dataLines) {
        const v = parseLine(line, docBlock.columns);
        try {
          await pool.query(`
            INSERT INTO "Document" (id, "studentId", "uploadedById", type, "originalName", "storedName", "mimeType", "sizeBytes", status, "storagePath", "ocrResult", "ocrStatus", "ocrRunAt", "uploadedAt", version, "isLatest", "previousId", "deletedAt", "deletedBy", "fileData", "ocrConfidence", "reviewStatus", verification_notes, verified_by, verified_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
            ON CONFLICT (id) DO NOTHING
          `, [
            v.id, v.studentId, v.uploadedById, v.type, v.originalName, v.storedName,
            v.mimeType, v.sizeBytes ? parseInt(v.sizeBytes) : 0, v.status, v.storagePath, v.ocrResult,
            v.ocrStatus, v.ocrRunAt, v.uploadedAt, v.version ? parseInt(v.version) : 1,
            v.isLatest === 't', v.previousId, v.deletedAt, v.deletedBy, v.fileData,
            v.ocrConfidence ? parseFloat(v.ocrConfidence) : null, v.reviewStatus,
            v.verification_notes, v.verified_by, v.verified_at
          ]);
          console.log(`  ✓ ${v.originalName} (${v.type})`);
        } catch (err) {
          console.log(`  ⚠ ${v.originalName}: ${err.message.substring(0, 80)}`);
        }
      }
    }

    // Restore StudentStatusHistory
    console.log('\n─── Restoring StudentStatusHistory ───');
    const sshBlock = blocks.find(b => b.tableName === 'StudentStatusHistory');
    if (sshBlock) {
      for (const line of sshBlock.dataLines) {
        const v = parseLine(line, sshBlock.columns);
        try {
          await pool.query(`
            INSERT INTO "StudentStatusHistory" (id, "studentId", status, "changedById", reason, "createdAt")
            VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (id) DO NOTHING
          `, [v.id, v.studentId, v.status, v.changedById, v.reason, v.createdAt]);
          console.log(`  ✓ ${v.studentId}`);
        } catch (err) {
          console.log(`  ⚠ ${err.message.substring(0, 60)}`);
        }
      }
    }

    // Restore StudentTimeline
    console.log('\n─── Restoring StudentTimeline ───');
    const stBlock = blocks.find(b => b.tableName === 'StudentTimeline');
    if (stBlock) {
      for (const line of stBlock.dataLines) {
        const v = parseLine(line, stBlock.columns);
        try {
          await pool.query(`
            INSERT INTO "StudentTimeline" (id, "studentId", event, details, "createdAt")
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (id) DO NOTHING
          `, [v.id, v.studentId, v.event, v.details, v.createdAt]);
          console.log(`  ✓ ${v.studentId}: ${v.event}`);
        } catch (err) {
          console.log(`  ⚠ ${err.message.substring(0, 60)}`);
        }
      }
    }

    // Restore ActivityLog
    console.log('\n─── Restoring ActivityLog ───');
    const alBlock = blocks.find(b => b.tableName === 'ActivityLog');
    let alCount = 0;
    if (alBlock) {
      for (const line of alBlock.dataLines) {
        const v = parseLine(line, alBlock.columns);
        try {
          await pool.query(`
            INSERT INTO "ActivityLog" (id, "actorUserId", action, category, "entityType", "entityId", details, "createdAt")
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (id, "createdAt") DO NOTHING
          `, [v.id, v.actorUserId, v.action, v.category, v.entityType, v.entityId, v.details, v.createdAt]);
          alCount++;
        } catch (err) {
          // Skip silently
        }
      }
    }
    console.log(`  ✓ ${alCount} ActivityLogs restored`);

    // Restore RefreshToken
    console.log('\n─── Restoring RefreshToken ───');
    const rtBlock = blocks.find(b => b.tableName === 'RefreshToken');
    let rtCount = 0;
    if (rtBlock) {
      for (const line of rtBlock.dataLines) {
        const v = parseLine(line, rtBlock.columns);
        try {
          await pool.query(`
            INSERT INTO "RefreshToken" (id, "userId", "tokenHash", family, "expiresAt", "revokedAt", "createdAt")
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO NOTHING
          `, [v.id, v.userId, v.tokenHash, v.family, v.expiresAt, v.revokedAt, v.createdAt]);
          rtCount++;
        } catch (err) {
          // Skip silently
        }
      }
    }
    console.log(`  ✓ ${rtCount} RefreshTokens restored`);

    // Set active AcademicYear
    console.log('\n─── Setting Active AcademicYear ───');
    await pool.query('UPDATE "AcademicYear" SET "isActive" = false');
    const latestYear = await pool.query('SELECT id, name FROM "AcademicYear" ORDER BY "createdAt" DESC LIMIT 1');
    if (latestYear.rows.length > 0) {
      await pool.query('UPDATE "AcademicYear" SET "isActive" = true WHERE id = $1', [latestYear.rows[0].id]);
      console.log(`  ✓ Active: ${latestYear.rows[0].name}`);
    }

    // Final verification
    console.log('\n═══════════════════════════════════════════════');
    console.log('  RESTORE COMPLETE');
    console.log('═══════════════════════════════════════════════\n');

    const tables = ['Role', 'AcademicYear', 'User', 'Student', 'Guardian', 'Document', 'ActivityLog'];
    for (const table of tables) {
      const res = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`  ${table}: ${res.rows[0].count} records`);
    }

    console.log('\n  Restore complete. Please set up admin credentials via environment variables or admin setup script.');
    console.log('═══════════════════════════════════════════════\n');

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
