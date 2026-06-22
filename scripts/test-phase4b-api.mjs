import { createDbClient } from './_db.mjs';

const API_BASE = process.env.ARBAL_API_BASE_URL || 'http://localhost:3001/api/v1';
const TEST_EMAIL = 'admin@arbal.local';
const TEST_PASSWORD = 'admin123';
const TEST_STUDENT_EMAIL = 'verify-p0@example.invalid';

async function test() {
  console.log('=== P0 Verification: login ===');
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
  const token = loginData.accessToken;

  // 1. Get Academic Year
  const ayRes = await fetch(`${API_BASE}/students/academic-years`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ayData = await ayRes.json();
  const academicYearId = ayData[0]?.id;

  // 2. Create student payload with all Phase 4A/4B fields
  const payload = {
    nama: 'Verify P0 Student',
    namaPanggilan: 'P0Student',
    jenisKelamin: 'LAKI_LAKI',
    tempatLahir: 'Jakarta',
    tanggalLahir: '2010-05-20',
    nik: '1122334455667788',
    nomorKK: '8877665544332211',
    nisn: '9876543210',
    telepon: '081234567890',
    email: TEST_STUDENT_EMAIL,
    alamat: 'Jl. P0 Verification No. 4A',
    academicYearId,
    status: 'PENDAFTAR',
    kelas: 'X-A',
    jurusan: 'TRM',
    asalSekolah: 'SMP Mustaqbal',
    tahunLulusSebelumnya: 2025,
    anakKe: 2,
    jumlahSaudara: 3,
    // Guardian fields
    namaAyah: 'Ayah P0',
    ktpAyah: '1234567890123456',
    pendidikanAyah: 'SMA',
    pekerjaanAyah: 'Wiraswasta',
    teleponAyah: '081212121212',
    statusAyah: 'MASIH_HIDUP',
    namaIbu: 'Ibu P0',
    ktpIbu: '6543210987654321',
    pendidikanIbu: 'Diploma',
    pekerjaanIbu: 'Ibu Rumah Tangga',
    teleponIbu: '081313131313',
    statusIbu: 'MASIH_HIDUP',
    namaWali: 'Wali P0',
    hubunganWali: 'Paman',
    teleponWali: '081414141414',
    alamatWali: 'Jl. Wali P0 No. 4',
    teleponOrangTua: '081111111111',
    alamatOrangTua: 'Jl. OT P0 No. 5',
  };

  console.log('\n=== P0 Verification: Creating student via API ===');
  const createRes = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const createdStudent = await createRes.json();
  if (!createRes.ok) {
    console.error('Failed to create student:', createdStudent);
    process.exit(1);
  }
  console.log(`✅ Student created successfully with ID: ${createdStudent.id}`);

  // Query Database to verify fields are written correctly
  console.log('\n=== P0 Verification: Querying Database to check fields ===');
  const client = createDbClient();
  await client.connect();

  const dbStudent = await client.query(
    `SELECT * FROM "Student" WHERE id = $1`,
    [createdStudent.id]
  );
  const dbGuardian = await client.query(
    `SELECT * FROM "Guardian" WHERE "studentId" = $1`,
    [createdStudent.id]
  );

  const studentRow = dbStudent.rows[0];
  const guardianRow = dbGuardian.rows[0];

  console.log('Student Database Row Fields:');
  console.log(`- nik: ${studentRow.nik} (expected: 1122334455667788)`);
  console.log(`- nomorKK: ${studentRow.nomorKK} (expected: 8877665544332211)`);
  console.log(`- tempatLahir: ${studentRow.tempatLahir} (expected: Jakarta)`);
  console.log(`- jenisKelamin: ${studentRow.jenisKelamin} (expected: LAKI_LAKI)`);
  console.log(`- status: ${studentRow.status} (expected: PENDAFTAR)`);
  console.log(`- anakKe: ${studentRow.anakKe} (expected: 2)`);
  console.log(`- jumlahSaudara: ${studentRow.jumlahSaudara} (expected: 3)`);

  console.log('Guardian Database Row Fields:');
  console.log(`- namaAyah: ${guardianRow.namaAyah} (expected: Ayah P0)`);
  console.log(`- ktpAyah: ${guardianRow.ktpAyah} (expected: 1234567890123456)`);
  console.log(`- pendidikanAyah: ${guardianRow.pendidikanAyah} (expected: SMA)`);
  console.log(`- statusAyah: ${guardianRow.statusAyah} (expected: MASIH_HIDUP)`);
  console.log(`- namaWali: ${guardianRow.namaWali} (expected: Wali P0)`);
  console.log(`- hubunganWali: ${guardianRow.hubunganWali} (expected: Paman)`);

  // Verify all fields are exact matches
  if (
    studentRow.nik !== '1122334455667788' ||
    studentRow.nomorKK !== '8877665544332211' ||
    studentRow.tempatLahir !== 'Jakarta' ||
    studentRow.jenisKelamin !== 'LAKI_LAKI' ||
    studentRow.status !== 'PENDAFTAR' ||
    guardianRow.namaAyah !== 'Ayah P0' ||
    guardianRow.pendidikanAyah !== 'SMA' ||
    guardianRow.namaWali !== 'Wali P0'
  ) {
    console.error('❌ Database field verification FAILED!');
    await client.end();
    process.exit(1);
  }
  console.log('✅ Database field verification PASS.');

  // 3. Update student payload to verify edit/update flow
  console.log('\n=== P0 Verification: Editing student via API ===');
  const updatePayload = {
    ...payload,
    nama: 'Verify P0 Student Edited',
    nik: '9999999999999999',
    nomorKK: '7777777777777777',
    namaAyah: 'Ayah P0 Edited',
    pendidikanAyah: 'Sarjana S1',
  };

  const updateRes = await fetch(`${API_BASE}/students/${createdStudent.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updatePayload),
  });

  const updatedStudent = await updateRes.json();
  if (!updateRes.ok) {
    console.error('Failed to update student:', updatedStudent);
    await client.end();
    process.exit(1);
  }
  console.log(`✅ Student updated successfully via API.`);

  // Re-query database to verify updates
  const dbStudentEdit = await client.query(
    `SELECT * FROM "Student" WHERE id = $1`,
    [createdStudent.id]
  );
  const dbGuardianEdit = await client.query(
    `SELECT * FROM "Guardian" WHERE "studentId" = $1`,
    [createdStudent.id]
  );

  const studentRowEdit = dbStudentEdit.rows[0];
  const guardianRowEdit = dbGuardianEdit.rows[0];

  console.log('Updated Database Row Fields:');
  console.log(`- nama: ${studentRowEdit.nama} (expected: Verify P0 Student Edited)`);
  console.log(`- nik: ${studentRowEdit.nik} (expected: 9999999999999999)`);
  console.log(`- nomorKK: ${studentRowEdit.nomorKK} (expected: 7777777777777777)`);
  console.log(`- namaAyah: ${guardianRowEdit.namaAyah} (expected: Ayah P0 Edited)`);
  console.log(`- pendidikanAyah: ${guardianRowEdit.pendidikanAyah} (expected: Sarjana S1)`);

  if (
    studentRowEdit.nama !== 'Verify P0 Student Edited' ||
    studentRowEdit.nik !== '9999999999999999' ||
    studentRowEdit.nomorKK !== '7777777777777777' ||
    guardianRowEdit.namaAyah !== 'Ayah P0 Edited' ||
    guardianRowEdit.pendidikanAyah !== 'Sarjana S1'
  ) {
    console.error('❌ Database update verification FAILED!');
    await client.end();
    process.exit(1);
  }
  console.log('✅ Database update verification PASS.');

  // 4. Cleanup
  console.log('\n=== P0 Verification: Cleanup ===');
  await client.query(`DELETE FROM "StudentStatusHistory" WHERE "studentId" = $1`, [createdStudent.id]);
  await client.query(`DELETE FROM "StudentTimeline" WHERE "studentId" = $1`, [createdStudent.id]);
  await client.query(`DELETE FROM "ActivityLog" WHERE "entityId" = $1`, [createdStudent.id]);
  await client.query(`DELETE FROM "Guardian" WHERE "studentId" = $1`, [createdStudent.id]);
  await client.query(`DELETE FROM "Student" WHERE id = $1`, [createdStudent.id]);
  console.log('✅ Cleanup complete. Database restored.');

  await client.end();
  console.log('\n🎉 ALL P0 CRUD INTEGRATION TESTS PASSED!');
}

test().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
