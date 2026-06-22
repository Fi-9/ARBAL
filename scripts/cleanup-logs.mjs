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
try {
  await client.connect();
  console.log('🔌 Connected to database. Performing cleanup of legacy logs...');

  const deleteRes = await client.query(`
    DELETE FROM "ActivityLog" 
    WHERE action = 'SYNC_SHEETS' 
       OR action = 'SYNC_DRIVE' 
       OR action = 'BACKUP_DRIVE'
       OR details LIKE '%Google Sheets%' 
       OR details LIKE '%Google Drive%'
  `);
  console.log(`✅ Cleared ${deleteRes.rowCount} legacy activity log records related to cloud sync.`);

} catch (e) {
  console.error('❌ Cleanup failed:', e);
} finally {
  await client.end();
}
