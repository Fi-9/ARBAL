import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from '../../scripts/_db.mjs';

const pool = new pg.Pool({
  connectionString: getDatabaseUrl(),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  console.log('=== Running Phase 3 Security & RBAC Verification ===');
  
  try {
    // 1. Create temporary Academic Year
    console.log('1. Creating test Academic Year...');
    const ay = await prisma.academicYear.create({
      data: {
        id: 'ay-test-phase3',
        name: '2099/2100',
        isActive: false,
      },
    });

    // 2. Create Student with new fields
    console.log('2. Creating test Student with PII fields...');
    const student = await prisma.student.create({
      data: {
        id: 'stu-test-phase3',
        nama: 'Test Student Phase 3',
        email: 'test-phase3@example.com',
        telepon: '089999999999',
        alamat: 'Jl. Test Phase 3',
        kelas: 'X-RPL',
        jurusan: 'RPL',
        angkatan: 2099,
        tanggalLahir: new Date('2012-12-12'),
        academicYearId: ay.id,
        nik: '1234567890123456',
        nomorKK: '6543210987654321',
        namaPanggilan: 'Phase3',
        status: 'PENDAFTAR',
        Guardian: {
          create: {
            id: 'gua-test-phase3',
            namaAyah: 'Ayah Phase 3',
            namaIbu: 'Ibu Phase 3',
            pendidikanAyah: 'S1',
            pendidikanIbu: 'D3',
            statusAyah: 'MASIH_HIDUP',
            statusIbu: 'MASIH_HIDUP',
            teleponAyah: '08123456789',
            teleponIbu: '08987654321',
            ktpAyah: '1111111111111111',
            ktpIbu: '2222222222222222',
            namaWali: 'Wali Phase 3',
            teleponWali: '081111111111',
          }
        }
      }
    });

    // We will simulate the minimizeStudentPii function since we want to verify it directly.
    // Let's import the service or mock it. To be completely sure, we can just load the students.service.ts
    // but since this is a NestJS service, instantiating it requires Nest dependency injection or a manual constructor.
    // Let's instantiate it manually:
    // const service = new StudentsService(prisma);
    // Wait, let's write a small wrapper that imports the class and runs it.
    // But since it's TypeScript, running it with node might require ts-node or dynamic compilation.
    // Wait! Can we just test the endpoints using a supertest/Jest test?
    // Let's check backend/src/modules/students/students.service.ts to see if we can import it.
    // Yes, we can write a Jest test or a typescript script, but since Jest is already configured,
    // let's add a test inside backend/src/modules/students/students.service.spec.ts!
    // Let's view the existing students.service.spec.ts first.
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}
