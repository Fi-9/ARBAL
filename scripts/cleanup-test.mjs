import { createDbClient } from './_db.mjs';

const client = createDbClient();
const emailList = (process.env.ARBAL_TEST_EMAILS || 'cleanup-me@example.invalid')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

try {
  await client.connect();
  const ids = await client.query(`SELECT id FROM "Student" WHERE email = ANY($1)`, [emailList]);
  if (ids.rows.length > 0) {
    const idList = ids.rows.map(r => r.id);
    await client.query(`DELETE FROM "Guardian" WHERE "studentId" = ANY($1)`, [idList]);
    const r = await client.query(`DELETE FROM "Student" WHERE id = ANY($1)`, [idList]);
    console.log(`Deleted ${r.rowCount} test students`);
  } else {
    console.log('No test students to delete');
  }
} finally {
  await client.end();
}
