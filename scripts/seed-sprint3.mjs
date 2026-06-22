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
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function run() {
  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL for data migration/seeding.');

    // 1. Create Academic Year "2025/2026"
    console.log('🌱 Creating default AcademicYear "2025/2026"...');
    const ayId = 'ay-2025-2026-default-id';
    await client.query(`
      INSERT INTO "AcademicYear" (id, name, "isActive", "createdAt")
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (name) DO UPDATE SET "isActive" = true
      RETURNING id
    `, [ayId, '2025/2026', true]);

    // Retrieve the actual academic year ID (just to be safe)
    const ayRes = await client.query('SELECT id FROM "AcademicYear" WHERE name = $1', ['2025/2026']);
    const academicYearId = ayRes.rows[0].id;
    console.log(`AcademicYear ID: ${academicYearId}`);

    // 2. Initialize Sequences
    console.log('🌱 Initializing Sequence counters...');
    await client.query(`
      INSERT INTO "Sequence" (id, value)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING
    `, ['NIS_2025', 0]);

    await client.query(`
      INSERT INTO "Sequence" (id, value)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING
    `, ['PPDB_2025', 0]);

    // 3. Migrate Existing Students
    console.log('🌱 Migrating existing students...');
    const studentsRes = await client.query('SELECT id, "nisSekolah", "registrationNumber" FROM "Student"');
    console.log(`Found ${studentsRes.rows.length} students to migrate.`);

    let nisCounter = 0;
    let ppdbCounter = 0;

    for (const student of studentsRes.rows) {
      let updateFields = [];
      let updateParams = [];
      let paramIndex = 1;

      // Ensure AcademicYear relation
      updateFields.push(`"academicYearId" = $${paramIndex++}`);
      updateParams.push(academicYearId);

      // Ensure angkatan cohort
      updateFields.push(`"angkatan" = $${paramIndex++}`);
      updateParams.push(2025);

      // Check/Generate NIS Sekolah
      if (!student.nisSekolah) {
        nisCounter++;
        const generatedNis = `NIS-2025-${String(nisCounter).padStart(4, '0')}`;
        updateFields.push(`"nisSekolah" = $${paramIndex++}`);
        updateParams.push(generatedNis);
        console.log(`Student ${student.id}: generated NIS ${generatedNis}`);
      }

      // Check/Generate PPDB registration number
      if (!student.registrationNumber) {
        ppdbCounter++;
        const generatedPpdb = `PPDB-2025-${String(ppdbCounter).padStart(4, '0')}`;
        updateFields.push(`"registrationNumber" = $${paramIndex++}`);
        updateParams.push(generatedPpdb);
        console.log(`Student ${student.id}: generated PPDB ${generatedPpdb}`);
      }

      if (updateFields.length > 0) {
        updateParams.push(student.id);
        const query = `
          UPDATE "Student"
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `;
        await client.query(query, updateParams);
      }
    }

    // 4. Update the Sequence counters in the database if we generated any numbers
    if (nisCounter > 0) {
      await client.query('UPDATE "Sequence" SET value = GREATEST(value, $1) WHERE id = $2', [nisCounter, 'NIS_2025']);
    }
    if (ppdbCounter > 0) {
      await client.query('UPDATE "Sequence" SET value = GREATEST(value, $1) WHERE id = $2', [ppdbCounter, 'PPDB_2025']);
    }

    console.log('✅ Seeding and migration completed successfully.');
  } catch (e) {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
