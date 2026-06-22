/**
 * Reset password for a target email.
 * Run: node scripts/reset-admin-password.mjs <newPassword> <email>
 *
 * Default new password if not provided: "change-me-now"
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('../backend/node_modules/bcryptjs');
import { createDbClient } from './_db.mjs';

const newPassword = process.argv[2] || 'change-me-now';
const email = process.argv[3];

if (!email) {
  console.error('Provide the target email explicitly: node scripts/reset-admin-password.mjs <newPassword> <email>');
  process.exit(1);
}

const client = createDbClient();

try {
  await client.connect();
  const hash = await bcrypt.hash(newPassword, 12);
  const r = await client.query(
    `UPDATE "User" SET "passwordHash"=$1, "updatedAt"=NOW() WHERE email=$2 RETURNING id, name, email`,
    [hash, email]
  );
  if (r.rowCount === 0) {
    console.error(`User with email ${email} not found`);
    process.exit(1);
  }
  // Also revoke all refresh tokens for security
  await client.query(`UPDATE "RefreshToken" SET "revokedAt"=NOW() WHERE "userId"=$1 AND "revokedAt" IS NULL`, [r.rows[0].id]);
  console.log(`Password reset for ${r.rows[0].name} <${r.rows[0].email}>`);
  console.log(`New password: ${newPassword}`);
  console.log('All existing refresh tokens revoked.');
} catch (e) {
  console.error('FAIL:', e.message);
} finally {
  await client.end();
}
