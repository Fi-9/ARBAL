import { createDbClient } from './_db.mjs';

const client = createDbClient();

try {
  await client.connect();
  const r = await client.query(`SELECT id, "nisSekolah", nama, email, "academicYearId", "deletedAt", "createdAt" FROM "Student" ORDER BY "createdAt" DESC`);
  console.log(`Total students in DB: ${r.rows.length}`);
  r.rows.forEach(s => {
    console.log(`  ${s.deletedAt ? '[DELETED]' : '[ACTIVE]'} ${s.id} | NIS=${s.nisSekolah || '-'} | ${s.nama} | ${s.email} | AY=${s.academicYearId} | created=${new Date(s.createdAt).toISOString()}`);
  });
} finally {
  await client.end();
}
