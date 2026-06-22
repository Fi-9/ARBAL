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
    console.log('Connected to PostgreSQL');

    // 1. Delete all students (cascades to Guardian and Document)
    const delStudents = await client.query('DELETE FROM "Student"');
    console.log(`Deleted ${delStudents.rowCount} student records (cascaded to Guardians and Documents)`);

    // 2. Remove obsolete role records from Role table
    const delRoles = await client.query(
      'DELETE FROM "Role" WHERE name = \'STAFF_TU\' OR name = \'KEPALA_SEKOLAH\''
    );
    console.log(`Deleted ${delRoles.rowCount} obsolete role records from Role table`);

    console.log('Cleanup script executed successfully.');
  } catch (err) {
    console.error('Error executing script:', err);
  } finally {
    await client.end();
  }
}

run();
