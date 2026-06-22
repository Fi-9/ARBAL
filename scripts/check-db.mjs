/**
 * ARBAL - Database connectivity test script
 * Run: node scripts/check-db.mjs
 */

import { createDbClient, getDatabaseUrl } from './_db.mjs';

const DATABASE_URL = getDatabaseUrl();
const parsedUrl = new URL(DATABASE_URL);

console.log('Connecting to PostgreSQL...');
console.log(`   Host: ${parsedUrl.hostname}`);
console.log(`   Port: ${parsedUrl.port}`);
console.log(`   DB:   ${parsedUrl.pathname.slice(1)}`);
console.log(`   User: ${parsedUrl.username}`);
console.log('');

const client = createDbClient({ connectionTimeoutMillis: 30000 });

try {
  await client.connect();

  const versionResult = await client.query('SELECT version()');
  console.log('Connection successful!');
  console.log(`   ${versionResult.rows[0].version.split(',')[0]}`);

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
    console.log('   TimescaleDB: extension not available on this PostgreSQL instance');
  }

  const tablesResult = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  if (tablesResult.rows.length === 0) {
    console.log('   Tables: (none - database is empty, ready for schema migration)');
  } else {
    console.log(`   Tables: ${tablesResult.rows.map((r) => r.tablename).join(', ')}`);
  }
} catch (err) {
  console.error('Connection failed:');
  console.error(`   ${err.message}`);

  if (err.code === 'ECONNREFUSED') {
    console.error(`\n   -> PostgreSQL server is not reachable at ${parsedUrl.hostname}:${parsedUrl.port}`);
    console.error('   -> Check that the server is running and firewall allows port 5432');
  } else if (err.code === '3D000') {
    console.error(`\n   -> Database "${parsedUrl.pathname.slice(1)}" does not exist yet`);
    console.error(`   -> CREATE DATABASE ${parsedUrl.pathname.slice(1)}; on the PostgreSQL server first`);
  } else if (err.code === '28P01') {
    console.error('\n   -> Authentication failed - wrong username or password');
  } else if (err.code === 'ETIMEDOUT') {
    console.error(`\n   -> Connection timed out - check network or VPN access to ${parsedUrl.hostname}`);
  }
  process.exit(1);
} finally {
  await client.end();
}
