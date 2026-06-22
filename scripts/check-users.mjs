import { createDbClient } from './_db.mjs';

const client = createDbClient({ connectionTimeoutMillis: 30000 });

try {
  await client.connect();
  console.log('Connected to PostgreSQL');

  // Check tables
  const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  console.log('Tables:', tables.rows.map(r => r.tablename).join(', ') || '(none)');

  // Check Roles
  try {
    const roles = await client.query(`SELECT id, name FROM "Role" ORDER BY name`);
    console.log(`\nRoles (${roles.rows.length}):`);
    roles.rows.forEach(r => console.log(`  - ${r.name} (id=${r.id})`));
  } catch (e) { console.log('Roles table error:', e.message); }

  // Check Users
  try {
    const users = await client.query(`SELECT u.id, u.name, u.email, u."isActive", u."deletedAt", r.name as role FROM "User" u LEFT JOIN "Role" r ON u."roleId" = r.id ORDER BY u."createdAt" DESC`);
    console.log(`\nUsers (${users.rows.length}):`);
    users.rows.forEach(u => console.log(`  - ${u.name} <${u.email}> role=${u.role} active=${u.isActive} deleted=${u.deletedAt ? 'yes' : 'no'}`));
  } catch (e) { console.log('Users table error:', e.message); }

  // Check AcademicYear
  try {
    const ays = await client.query(`SELECT id, name, "isActive" FROM "AcademicYear" ORDER BY name DESC`);
    console.log(`\nAcademicYears (${ays.rows.length}):`);
    ays.rows.forEach(a => console.log(`  - ${a.name} (active=${a.isActive})`));
  } catch (e) { console.log('AcademicYear table error:', e.message); }

} catch (err) {
  console.error('FAIL:', err.message);
} finally {
  await client.end();
}
