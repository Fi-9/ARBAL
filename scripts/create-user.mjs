/**
 * Create a new login account for ARBAL.
 * 
 * Usage: node scripts/create-user.mjs
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomUUID } from 'crypto';

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

// --- bcrypt implementation using native crypto ---
// We use a simple approach: import bcryptjs dynamically
async function hashPassword(password) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.hash(password, 12);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function run() {
  try {
    await client.connect();
    console.log('Connected to database.');

    // Ensure roles exist
    const roles = ['SUPER_ADMIN', 'GURU'];
    for (const roleName of roles) {
      await client.query(`
        INSERT INTO "Role" (id, name)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [`role-${roleName.toLowerCase()}`, roleName]);
    }
    console.log('Roles ensured.');

    // Get SUPER_ADMIN role ID
    const roleRes = await client.query('SELECT id FROM "Role" WHERE name = $1', ['SUPER_ADMIN']);
    const roleId = roleRes.rows[0].id;

    // Create new user
    const userId = 'admin-user-default-id';
    const email = 'admin@arbal.local';
    const password = 'admin123';
    const name = 'Admin ARBAL';
    const passwordHash = await hashPassword(password);

    await client.query(`
      INSERT INTO "User" (id, name, email, "passwordHash", "isActive", "createdAt", "updatedAt", "roleId")
      VALUES ($1, $2, $3, $4, true, NOW(), NOW(), $5)
      ON CONFLICT (email) DO UPDATE SET "passwordHash" = $4, "isActive" = true
    `, [userId, name, email, passwordHash, roleId]);

    console.log('');
    console.log('=== AKUN BERHASIL DIBUAT ===');
    console.log(`Email    : ${email}`);
    console.log(`Password : ${password}`);
    console.log(`Role     : SUPER_ADMIN`);
    console.log(`Name     : ${name}`);
    console.log('============================');
    console.log('');
    console.log('Silakan login dengan kredensial di atas.');

  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
