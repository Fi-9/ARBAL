import pg from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load env
dotenv.config({ path: resolve('C:/Users/renre/Downloads/ARBAL/.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    const studentId = 'TM-2026-0008';
    console.log(`Setting student ${studentId} to soft-deleted state...`);
    
    // Simulate soft-delete
    await client.query(
      `UPDATE "Student" SET "deletedAt" = NOW(), "deletedBy" = 'TEST_ACTOR', "status" = 'CUTI' WHERE "id" = $1`,
      [studentId]
    );
    await client.query(
      `UPDATE "Guardian" SET "deletedAt" = NOW(), "deletedBy" = 'TEST_ACTOR' WHERE "studentId" = $1`,
      [studentId]
    );
    console.log('Student soft-deleted successfully.');

    // ──────────────────────────────────────────
    // TEST RESTORE (Proposed Service Logic)
    // ──────────────────────────────────────────
    console.log('\n--- Simulating Restore ---');
    await client.query('BEGIN');
    
    // We simulate updateMany via direct SQL or Prisma simulation
    // In service we will use tx.student.updateMany
    const sRestore = await client.query(
      `UPDATE "Student" SET "deletedAt" = NULL, "deletedBy" = NULL, "status" = 'AKTIF', "updatedAt" = NOW() WHERE "id" = $1 RETURNING *`,
      [studentId]
    );
    console.log('Restored Student:', sRestore.rows[0]);

    const gRestore = await client.query(
      `UPDATE "Guardian" SET "deletedAt" = NULL, "deletedBy" = NULL WHERE "studentId" = $1`,
      [studentId]
    );
    console.log('Restored Guardian. Count:', gRestore.rowCount);

    await client.query('COMMIT');
    console.log('Restore simulation succeeded!');

    // ──────────────────────────────────────────
    // TEST PERMANENT DELETE (Proposed Service Logic)
    // ──────────────────────────────────────────
    console.log('\n--- Simulating Permanent Delete ---');
    await client.query('BEGIN');

    // Soft delete it first again to simulate
    await client.query(
      `UPDATE "Student" SET "deletedAt" = NOW(), "deletedBy" = 'TEST_ACTOR', "status" = 'CUTI' WHERE "id" = $1`,
      [studentId]
    );

    // Delete related records via raw SQL
    const docDel = await client.query(
      `DELETE FROM "Document" WHERE "studentId" = $1`,
      [studentId]
    );
    console.log('Deleted Documents count:', docDel.rowCount);

    const guardDel = await client.query(
      `DELETE FROM "Guardian" WHERE "studentId" = $1`,
      [studentId]
    );
    console.log('Deleted Guardian count:', guardDel.rowCount);

    const sDel = await client.query(
      `DELETE FROM "Student" WHERE "id" = $1`,
      [studentId]
    );
    console.log('Deleted Student count:', sDel.rowCount);

    await client.query('COMMIT');
    console.log('Permanent delete simulation succeeded!');

  } catch (err) {
    console.error('Error during simulation:', err);
    try { await client.query('ROLLBACK'); } catch {}
  } finally {
    client.release();
    await pool.end();
  }
}

run();
