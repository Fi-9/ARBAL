/**
 * ARBAL — Database connectivity test script
 * Run: node scripts/check-db.mjs
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env manually (no dotenv dependency needed for this script)
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
  console.error('❌  DATABASE_URL not found in .env');
  process.exit(1);
}

console.log('🔌  Connecting to PostgreSQL...');
console.log(`   Host: ${new URL(DATABASE_URL).hostname}`);
console.log(`   Port: ${new URL(DATABASE_URL).port}`);
console.log(`   DB:   ${new URL(DATABASE_URL).pathname.slice(1)}`);
console.log(`   User: ${new URL(DATABASE_URL).username}`);
console.log('');

const client = new pg.Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 8000 });

try {
  await client.connect();
  
  // Basic connectivity + version
  const versionResult = await client.query('SELECT version()');
  console.log('✅  Connection successful!');
  console.log(`   ${versionResult.rows[0].version.split(',')[0]}`);
  
  // Check if TimescaleDB extension is available
  const tsdbResult = await client.query(`
    SELECT name, default_version, installed_version 
    FROM pg_available_extensions 
    WHERE name = 'timescaledb'
  `);
  
  if (tsdbResult.rows.length > 0) {
    const ts = tsdbResult.rows[0];
    const installed = ts.installed_version ? `installed v${ts.installed_version}` : 'available but NOT installed';
    console.log(`   TimescaleDB: ${installed} (latest: v${ts.default_version})`);
  } else {
    console.log('   TimescaleDB: ⚠️  extension not available on this PostgreSQL instance');
  }

  // Check if arbal_db tables exist yet
  const tablesResult = await client.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `);
  
  if (tablesResult.rows.length === 0) {
    console.log('   Tables: (none — database is empty, ready for schema migration)');
  } else {
    console.log(`   Tables: ${tablesResult.rows.map(r => r.tablename).join(', ')}`);
  }

} catch (err) {
  console.error('❌  Connection failed:');
  console.error(`   ${err.message}`);
  
  if (err.code === 'ECONNREFUSED') {
    console.error('\n   → PostgreSQL server is not reachable at 192.168.100.55:5432');
    console.error('   → Check that the server is running and firewall allows port 5432');
  } else if (err.code === '3D000') {
    console.error('\n   → Database "arbal_db" does not exist yet');
    console.error('   → CREATE DATABASE arbal_db; on the PostgreSQL server first');
  } else if (err.code === '28P01') {
    console.error('\n   → Authentication failed — wrong username or password');
  } else if (err.code === 'ETIMEDOUT') {
    console.error('\n   → Connection timed out — check network/VPN access to 192.168.100.55');
  }
  process.exit(1);
} finally {
  await client.end();
}
