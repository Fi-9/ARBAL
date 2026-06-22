/**
 * Simulate POST /students request for local debugging.
 * Run with ARBAL_TEST_EMAIL and ARBAL_TEST_PASSWORD set in env.
 */
import { createDbClient } from './_db.mjs';

const API_BASE = process.env.ARBAL_API_BASE_URL || 'http://localhost:3001/api/v1';
const TEST_EMAIL = process.env.ARBAL_TEST_EMAIL;
const TEST_PASSWORD = process.env.ARBAL_TEST_PASSWORD;
const TEST_STUDENT_EMAIL = process.env.ARBAL_TEST_STUDENT_EMAIL || 'cleanup-me@example.invalid';
const TEST_STUDENT_NAME = process.env.ARBAL_TEST_STUDENT_NAME || 'Temporary Cleanup Record';

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('Set ARBAL_TEST_EMAIL and ARBAL_TEST_PASSWORD before running this script.');
  process.exit(1);
}

// 1. Login first
console.log('=== STEP 1: Login as admin ===');
const loginRes = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
const loginData = await loginRes.json();
if (!loginRes.ok) {
  console.error('Login failed:', loginData);
  process.exit(1);
}
console.log(`Logged in as: ${loginData.user.name} (${loginData.user.role})`);
const token = loginData.accessToken;

// 2. Get academic year ID
console.log('\n=== STEP 2: Get academic year ID ===');
const ayRes = await fetch(`${API_BASE}/students/academic-years`, {
  headers: { Authorization: `Bearer ${token}` },
});
const ayData = await ayRes.json();
console.log('Academic years:', ayData);
const academicYearId = ayData[0]?.id;
console.log(`Using academicYearId: ${academicYearId}`);

// 3. Get current student count BEFORE
console.log('\n=== STEP 3: Count students BEFORE ===');
const client = createDbClient();
await client.connect();
const before = await client.query(`SELECT COUNT(*) as c FROM "Student" WHERE "deletedAt" IS NULL`);
console.log(`Active students BEFORE: ${before.rows[0].c}`);

// 4. Simulate EXACT frontend payload
console.log('\n=== STEP 4: Simulate frontend POST /students ===');
const payload = {
  // id is omitted because frontend ID starts with S00 (skipped per service logic)
  nisn: '1234567890',
  academicYearId,
  nama: TEST_STUDENT_NAME,
  kelas: 'X-A',
  jurusan: 'RPL',
  email: TEST_STUDENT_EMAIL,
  telepon: '081234567890',
  alamat: 'Jl. Test No. 1',
  tanggalLahir: '2010-01-15',
  catatan: 'Temporary cleanup verification record',
  // Guardian fields (flat)
  namaAyah: 'Ayah Test',
  namaIbu: 'Ibu Test',
  teleponOrangTua: '081111111111',
};

console.log('Payload:', JSON.stringify(payload, null, 2));

const createRes = await fetch(`${API_BASE}/students`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(payload),
});

console.log(`Response status: ${createRes.status}`);
const createBody = await createRes.text();
console.log(`Response body: ${createBody.substring(0, 500)}`);

// 5. Check student count AFTER
console.log('\n=== STEP 5: Count students AFTER ===');
const after = await client.query(`SELECT COUNT(*) as c FROM "Student" WHERE "deletedAt" IS NULL`);
console.log(`Active students AFTER: ${after.rows[0].c}`);
console.log(`Diff: +${after.rows[0].c - before.rows[0].c}`);

// 6. Find the test student
console.log('\n=== STEP 6: Verify test student in DB ===');
const testStudent = await client.query(
  `SELECT id, nama, email, "academicYearId", angkatan, "createdAt" FROM "Student" WHERE email = $1`,
  [TEST_STUDENT_EMAIL]
);
console.log('Test students found:', testStudent.rows.length);
testStudent.rows.forEach(s => {
  console.log(`  - ${s.id} | ${s.nama} | ${s.email} | angkatan=${s.angkatan} | createdAt=${s.createdAt}`);
});

// 7. Cleanup test data
console.log('\n=== STEP 7: Cleanup test data ===');
await client.query(`DELETE FROM "Guardian" WHERE "studentId" IN (SELECT id FROM "Student" WHERE email = $1)`, [TEST_STUDENT_EMAIL]);
const delStu = await client.query(`DELETE FROM "Student" WHERE email = $1`, [TEST_STUDENT_EMAIL]);
console.log(`Deleted ${delStu.rowCount} test student(s)`);

await client.end();
console.log('\nDone.');
