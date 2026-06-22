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
  const tables = ['User', 'Role', 'Student', 'Guardian', 'Document', 'ActivityLog'];
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM "${t}"`);
      console.log(`Table "${t}": ${res.rows[0].count} records`);
    } catch (e) {
      console.log(`Table "${t}" failed: ${e.message}`);
    }
  }
} catch (e) {
  console.error(e);
} finally {
  await client.end();
}
