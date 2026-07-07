import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

let DATABASE_URL = '';
for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    DATABASE_URL = trimmed.split('=').slice(1).join('=').replace(/^["']|["']$/g, '');
    break;
  }
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function run() {
  try {
    await client.connect();
    console.log('Connected to database.');

    // 1. Ensure roles exist
    const roles = ['SUPER_ADMIN', 'GURU'];
    for (const roleName of roles) {
      await client.query(`
        INSERT INTO "Role" (id, name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO NOTHING
      `, [`role-${roleName.toLowerCase()}`, roleName]);
    }
    console.log('Roles verified.');

    // 2. Ensure SYSTEM user exists
    await client.query(`
      INSERT INTO "User" (id, name, email, "passwordHash", "isActive", "createdAt", "updatedAt", "roleId")
      VALUES ('SYSTEM', 'SYSTEM', 'system@arbal.local', 'SYSTEM_LOCKED_ACCOUNT', false, NOW(), NOW(), 'role-super_admin')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('SYSTEM user verified.');

    // 3. Ensure AcademicYear "2025/2026" exists
    await client.query(`
      INSERT INTO "AcademicYear" (id, name, "isActive", "createdAt")
      VALUES ('ay-2025-2026-default-id', '2025/2026', true, NOW())
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('AcademicYear verified.');

    // 4. Ensure default classes exist
    const defaultClasses = [
      { id: 'class-x-id', name: 'Kelas X', description: 'Kelas X PKBM Mustaqbal' },
      { id: 'class-xi-id', name: 'Kelas XI', description: 'Kelas XI PKBM Mustaqbal' },
      { id: 'class-xii-id', name: 'Kelas XII', description: 'Kelas XII PKBM Mustaqbal' },
      { id: 'class-a-id', name: 'Paket A', description: 'Program Kesetaraan Paket A (SD)' },
      { id: 'class-b-id', name: 'Paket B', description: 'Program Kesetaraan Paket B (SMP)' },
      { id: 'class-c-id', name: 'Paket C', description: 'Program Kesetaraan Paket C (SMA)' },
      { id: 'class-alumni-id', name: 'Alumni', description: 'Siswa yang telah menyelesaikan studi' },
    ];
    for (const cls of defaultClasses) {
      await client.query(`
        INSERT INTO "Class" (id, name, "isActive", description, "createdAt", "updatedAt")
        VALUES ($1, $2, true, $3, NOW(), NOW())
        ON CONFLICT (name) DO NOTHING
      `, [cls.id, cls.name, cls.description]);
    }
    console.log('Default classes verified.');

    console.log('Bootstrap seeding completed successfully!');
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
