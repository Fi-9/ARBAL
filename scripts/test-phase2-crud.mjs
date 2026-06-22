import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from './_db.mjs';

const pool = new pg.Pool({
  connectionString: getDatabaseUrl(),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  console.log('=== Running Phase 2 CRUD and Audit Log Verification ===');
  
  try {
    // 1. Create temporary Academic Year
    console.log('1. Creating test Academic Year...');
    const ay = await prisma.academicYear.create({
      data: {
        id: 'ay-test-phase2',
        name: '2099/2100',
        isActive: false,
      },
    });
    console.log(`- Created AcademicYear ID: ${ay.id}`);

    // 2. Create Student with new fields
    console.log('\n2. Creating test Student with new fields...');
    const student = await prisma.student.create({
      data: {
        id: 'stu-test-phase2',
        nama: 'Test Student Phase 2',
        email: 'test-phase2@example.com',
        telepon: '089999999999',
        alamat: 'Jl. Test Phase 2 No. 99',
        kelas: 'X-RPL',
        jurusan: 'RPL',
        angkatan: 2099,
        tanggalLahir: new Date('2012-12-12'),
        academicYearId: ay.id,
        nik: '1234567890123456',
        nomorKK: '6543210987654321',
        namaPanggilan: 'Phase2',
        jenisKelamin: 'LAKI_LAKI',
        tempatLahir: 'Bandung',
        asalSekolah: 'SMP Test Phase 2',
        tahunLulusSebelumnya: 2099,
        anakKe: 2,
        jumlahSaudara: 3,
        photoUrl: 'http://example.com/test-photo.jpg',
        status: 'PENDAFTAR',
        Guardian: {
          create: {
            id: 'gua-test-phase2',
            namaAyah: 'Ayah Phase 2',
            namaIbu: 'Ibu Phase 2',
            pendidikanAyah: 'S1',
            pendidikanIbu: 'D3',
            statusAyah: 'MASIH_HIDUP',
            statusIbu: 'MASIH_HIDUP',
            namaWali: 'Wali Phase 2',
            hubunganWali: 'Paman',
            teleponWali: '081111111111',
            alamatWali: 'Jl. Wali No. 2',
          }
        }
      },
      include: {
        Guardian: true,
      }
    });

    console.log('- Student successfully created:');
    console.log(`  - NIK: ${student.nik}`);
    console.log(`  - KK: ${student.nomorKK}`);
    console.log(`  - Nama Panggilan: ${student.namaPanggilan}`);
    console.log(`  - Jenis Kelamin: ${student.jenisKelamin}`);
    console.log(`  - Tempat Lahir: ${student.tempatLahir}`);
    console.log(`  - Asal Sekolah: ${student.asalSekolah}`);
    console.log(`  - Tahun Lulus: ${student.tahunLulusSebelumnya}`);
    console.log(`  - Anak Ke: ${student.anakKe} | Saudara: ${student.jumlahSaudara}`);
    console.log(`  - Photo URL: ${student.photoUrl}`);
    console.log(`  - Status: ${student.status}`);
    console.log(`  - Wali: ${student.Guardian?.namaWali} (${student.Guardian?.hubunganWali})`);

    // Verify fields
    if (
      student.nik !== '1234567890123456' ||
      student.nomorKK !== '6543210987654321' ||
      student.Guardian?.pendidikanAyah !== 'S1' ||
      student.Guardian?.namaWali !== 'Wali Phase 2'
    ) {
      throw new Error('Verification of newly inserted fields failed!');
    }
    console.log('✅ Creation verification PASS.');

    // 3. Update Student & Guardian
    console.log('\n3. Updating test Student & Guardian fields...');
    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        nik: '8888888888888888',
        nomorKK: '9999999999999999',
        namaPanggilan: 'Phase2-Edit',
        Guardian: {
          update: {
            pendidikanAyah: 'S2',
            namaWali: 'Wali Phase 2 Edited',
          }
        }
      },
      include: {
        Guardian: true,
      }
    });

    console.log('- Student successfully updated:');
    console.log(`  - Updated NIK: ${updated.nik}`);
    console.log(`  - Updated KK: ${updated.nomorKK}`);
    console.log(`  - Updated Nama Panggilan: ${updated.namaPanggilan}`);
    console.log(`  - Updated Pendidikan Ayah: ${updated.Guardian?.pendidikanAyah}`);
    console.log(`  - Updated Wali: ${updated.Guardian?.namaWali}`);

    if (
      updated.nik !== '8888888888888888' ||
      updated.nomorKK !== '9999999999999999' ||
      updated.namaPanggilan !== 'Phase2-Edit' ||
      updated.Guardian?.pendidikanAyah !== 'S2' ||
      updated.Guardian?.namaWali !== 'Wali Phase 2 Edited'
    ) {
      throw new Error('Verification of updated fields failed!');
    }
    console.log('✅ Update verification PASS.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // 4. Cleanup
    console.log('\n4. Cleaning up test data...');
    try {
      await prisma.guardian.deleteMany({ where: { studentId: 'stu-test-phase2' } });
      await prisma.student.deleteMany({ where: { id: 'stu-test-phase2' } });
      await prisma.academicYear.deleteMany({ where: { id: 'ay-test-phase2' } });
      console.log('- Test data cleaned up successfully.');
    } catch (cleanupError) {
      console.error('Cleanup warning:', cleanupError);
    }
    await prisma.$disconnect();
    console.log('=== Test finished successfully ===');
  }
}

test();
