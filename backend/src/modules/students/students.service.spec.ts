import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StudentsService', () => {
  let service: StudentsService;
  let prismaService: PrismaService;

  const mockPrismaService: any = {
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
    academicYear: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    sequence: {
      upsert: jest.fn(),
    },
    student: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    guardian: {
      create: jest.fn(),
      upsert: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    studentTimeline: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    studentStatusHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    studentNote: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    documentRequirement: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
    mockPrismaService.documentRequirement.findMany.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a student if found (no role)', async () => {
      const mockStudent = { id: 'stu-1', nama: 'Ahmad' };
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);

      const result = await service.findOne('stu-1');

      expect(prismaService.student.findUnique).toHaveBeenCalledWith({
        where: { id: 'stu-1' },
        include: expect.any(Object),
      });
      expect(result).toEqual({ ...mockStudent, completenessPercent: 100 });
    });

    it('should mask NIK/KK and nullify guardian KTP/phones for GURU role', async () => {
      const mockStudent = {
        id: 'stu-1',
        nama: 'Ahmad',
        nik: '1234567890123456',
        nomorKK: '6543210987654321',
        Guardian: {
          id: 'gua-1',
          studentId: 'stu-1',
          namaAyah: 'Budi',
          pekerjaanAyah: 'PNS',
          ktpAyah: '1111111111111111',
          teleponAyah: '08123456789',
          namaIbu: 'Siti',
          pekerjaanIbu: 'IRT',
          ktpIbu: '2222222222222222',
          teleponIbu: '08987654321',
          teleponOrangTua: '021123456',
          alamatOrangTua: 'Bandung',
          teleponWali: '08999999999',
        },
      };
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);

      const actor = { id: 'user-1', email: 'guru@test.com', name: 'Guru User', role: 'GURU' };
      const result = await service.findOne('stu-1', actor);

      expect(result.nik).toBe('************3456');
      expect(result.nomorKK).toBe('************4321');
      expect(result.Guardian.ktpAyah).toBeNull();
      expect(result.Guardian.teleponAyah).toBeNull();
      expect(result.Guardian.teleponWali).toBeNull();
      expect(result.Guardian.namaAyah).toBe('Budi');
    });

    it('should not mask PII for SUPER_ADMIN role', async () => {
      const mockStudent = {
        id: 'stu-1',
        nama: 'Ahmad',
        nik: '1234567890123456',
        nomorKK: '6543210987654321',
        Guardian: {
          id: 'gua-1',
          studentId: 'stu-1',
          namaAyah: 'Budi',
          pekerjaanAyah: 'PNS',
          ktpAyah: '1111111111111111',
          teleponAyah: '08123456789',
          namaIbu: 'Siti',
          pekerjaanIbu: 'IRT',
          ktpIbu: '2222222222222222',
          teleponIbu: '08987654321',
          teleponOrangTua: '021123456',
          alamatOrangTua: 'Bandung',
          teleponWali: '08999999999',
        },
      };
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);

      const actor = { id: 'user-1', email: 'admin@test.com', name: 'Admin User', role: 'SUPER_ADMIN' };
      const result = await service.findOne('stu-1', actor);

      expect(result.nik).toBe('1234567890123456');
      expect(result.nomorKK).toBe('6543210987654321');
      expect(result.Guardian.ktpAyah).toBe('1111111111111111');
      expect(result.Guardian.teleponAyah).toBe('08123456789');
      expect(result.Guardian.teleponWali).toBe('08999999999');
    });
  });

  describe('findTimeline', () => {
    it('should return student timeline', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue({ id: 'stu-1' });
      mockPrismaService.studentTimeline.findMany.mockResolvedValue([{ id: 't-1', studentId: 'stu-1' }]);

      const result = await service.findTimeline('stu-1');
      expect(result).toEqual([{ id: 't-1', studentId: 'stu-1' }]);
    });
  });

  describe('findNotes', () => {
    it('should return student notes', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue({ id: 'stu-1' });
      mockPrismaService.studentNote.findMany.mockResolvedValue([{ id: 'n-1', content: 'note content' }]);

      const result = await service.findNotes('stu-1');
      expect(result).toEqual([{ id: 'n-1', content: 'note content' }]);
    });
  });

  describe('createNote', () => {
    it('should create a student note', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue({ id: 'stu-1' });
      mockPrismaService.studentNote.create.mockResolvedValue({ id: 'n-1', content: 'hello' });

      const result = await service.createNote('stu-1', 'author-1', { content: 'hello' });
      expect(result).toEqual({ id: 'n-1', content: 'hello' });
    });
  });
});
