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
    console.log('Connected to database');

    // 1. Get the admin@arbal.local user
    const adminRes = await client.query('SELECT id FROM "User" WHERE email = $1', ['admin@arbal.local']);
    if (adminRes.rows.length === 0) {
      console.error('❌ Could not find admin@arbal.local. Please create it first.');
      process.exit(1);
    }
    const adminId = adminRes.rows[0].id;
    console.log(`Found admin@arbal.local with ID: ${adminId}`);

    // 2. Get all other users
    const otherUsersRes = await client.query('SELECT id, name, email FROM "User" WHERE id != $1', [adminId]);
    if (otherUsersRes.rows.length === 0) {
      console.log('No other users found.');
      return;
    }

    const otherUserIds = otherUsersRes.rows.map(r => r.id);
    console.log(`Found ${otherUserIds.length} other users to delete:`);
    for (const u of otherUsersRes.rows) {
      console.log(`  - ${u.name} <${u.email}> (ID: ${u.id})`);
    }

    // 3. Reassign ActivityLogs
    const logUpdate = await client.query(
      'UPDATE "ActivityLog" SET "actorUserId" = $1 WHERE "actorUserId" = ANY($2)',
      [adminId, otherUserIds]
    );
    console.log(`Reassigned ${logUpdate.rowCount} activity logs to admin@arbal.local`);

    // 4. Reassign Documents uploadedById
    const docUpdate = await client.query(
      'UPDATE "Document" SET "uploadedById" = $1 WHERE "uploadedById" = ANY($2)',
      [adminId, otherUserIds]
    );
    console.log(`Reassigned ${docUpdate.rowCount} documents to admin@arbal.local`);

    // 5. Delete RefreshTokens (cascaded but good to do explicitly or verify)
    const tokenDelete = await client.query(
      'DELETE FROM "RefreshToken" WHERE "userId" = ANY($1)',
      [otherUserIds]
    );
    console.log(`Deleted ${tokenDelete.rowCount} refresh tokens`);

    // 6. Delete Users
    const userDelete = await client.query(
      'DELETE FROM "User" WHERE id = ANY($1)',
      [otherUserIds]
    );
    console.log(`Deleted ${userDelete.rowCount} dummy users successfully.`);

  } catch (err) {
    console.error('Error executing script:', err);
  } finally {
    await client.end();
  }
}

run();
