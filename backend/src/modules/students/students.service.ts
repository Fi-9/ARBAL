import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { existsSync, unlinkSync } from 'fs';
import { Workbook } from 'exceljs';
import { randomUUID } from 'node:crypto';
import { join, resolve, isAbsolute } from 'path';
import { Cron } from '@nestjs/schedule';

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? resolve(process.env.UPLOADS_DIR)
  : join(__dirname, '..', '..', '..', 'uploads');

/** Shape of the authenticated user injected by JwtStrategy */
interface Actor {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private prisma: PrismaService) {}

  private calculateCompletenessPercent(student: any, requiredDocTypes: string[]): number {
    if (requiredDocTypes.length === 0) return 100;

    const studentDocs = student.Document || [];
    const uploadedTypes = new Set(
      studentDocs
        .filter((d: any) => d.deletedAt === null && d.isLatest && d.status !== 'DITOLAK')
        .map((d: any) => d.type)
    );

    let matchCount = 0;
    for (const reqType of requiredDocTypes) {
      if (uploadedTypes.has(reqType)) {
        matchCount++;
      }
    }

    return Math.round((matchCount / requiredDocTypes.length) * 100);
  }

  private minimizeStudentPii(student: any, actor?: Actor) {
    if (!student) return student;
    if (!actor) return student;

    if (actor.role === 'GURU') {
      const maskValue = (val?: string | null) => {
        if (!val) return val;
        if (val.length <= 4) return '*'.repeat(val.length);
        return '*'.repeat(val.length - 4) + val.slice(-4);
      };

      if (student.nik) {
        student.nik = maskValue(student.nik);
      }
      if (student.nomorKK) {
        student.nomorKK = maskValue(student.nomorKK);
      }

      if (student.Guardian) {
        student.Guardian = {
          id: student.Guardian.id,
          studentId: student.Guardian.studentId,
          namaAyah: student.Guardian.namaAyah,
          namaIbu: student.Guardian.namaIbu,
          pekerjaanAyah: student.Guardian.pekerjaanAyah,
          pekerjaanIbu: student.Guardian.pekerjaanIbu,
          alamatOrangTua: student.Guardian.alamatOrangTua,
          pendidikanAyah: student.Guardian.pendidikanAyah,
          pendidikanIbu: student.Guardian.pendidikanIbu,
          statusAyah: student.Guardian.statusAyah,
          statusIbu: student.Guardian.statusIbu,
          namaWali: student.Guardian.namaWali,
          hubunganWali: student.Guardian.hubunganWali,
          alamatWali: student.Guardian.alamatWali,
          ktpAyah: null,
          ktpIbu: null,
          teleponAyah: null,
          teleponIbu: null,
          teleponOrangTua: null,
          teleponWali: null,
          deletedAt: student.Guardian.deletedAt,
          deletedBy: student.Guardian.deletedBy,
        };
      }
    }
    return student;
  }

  async findAll(params?: { page?: number; limit?: number; search?: string; classFilter?: string; statusFilter?: string; angkatan?: number; jurusan?: string }, actor?: Actor) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 && params.limit <= 100 ? params.limit : 20;
    const skip = (page - 1) * limit;

    // Build search/filter where clause
    const where: Record<string, any> = { deletedAt: null };

    if (params?.search && params.search.trim().length >= 2) {
      const search = params.search.trim();
      const orConditions: any[] = [
        { nama: { contains: search, mode: 'insensitive' } },
        { nisSekolah: { contains: search, mode: 'insensitive' } },
        { nisn: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { Guardian: { namaAyah: { contains: search, mode: 'insensitive' } } },
        { Guardian: { namaIbu: { contains: search, mode: 'insensitive' } } },
      ];
      // Only SUPER_ADMIN can search by KTP parent data (PII)
      if (actor?.role === 'SUPER_ADMIN') {
        orConditions.push(
          { Guardian: { ktpAyah: { contains: search, mode: 'insensitive' } } },
          { Guardian: { ktpIbu: { contains: search, mode: 'insensitive' } } },
        );
      }
      where.OR = orConditions;
    }

    if (params?.classFilter && params.classFilter !== 'Semua') {
      where.kelas = params.classFilter;
    }
    if (params?.statusFilter && params.statusFilter !== 'Semua') {
      where.status = params.statusFilter as any; // AKTIF, ALUMNI, etc.
    }
    if (params?.jurusan && params.jurusan !== 'Semua') {
      where.jurusan = params.jurusan;
    }
    if (params?.angkatan && params.angkatan !== undefined) {
      where.angkatan = params.angkatan;
    }

    const [data, total, requirements] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          Guardian: true,
          Document: { where: { deletedAt: null } },
          AcademicYear: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.student.count({ where }),
      this.prisma.documentRequirement.findMany({ where: { isRequired: true } }),
    ]);

    const requiredTypes = requirements.map((r) => r.type);
    const dataWithCompleteness = data.map((student) => ({
      ...student,
      completenessPercent: this.calculateCompletenessPercent(student, requiredTypes),
    }));
    const minimizedData = dataWithCompleteness.map(s => this.minimizeStudentPii(s, actor));

    return {
      data: minimizedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, actor?: Actor) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        Guardian: true,
        Document: { where: { deletedAt: null } },
        AcademicYear: true,
      },
    });
    if (!student || student.deletedAt) throw new NotFoundException('Student not found');

    const requirements = await this.prisma.documentRequirement.findMany({
      where: { isRequired: true },
    });
    const requiredTypes = requirements.map((r) => r.type);

    const enriched = {
      ...student,
      completenessPercent: this.calculateCompletenessPercent(student, requiredTypes),
    };
    return this.minimizeStudentPii(enriched, actor);
  }

  private async getNextSequenceValue(tx: any, sequenceId: string): Promise<number> {
    const seq = await tx.sequence.upsert({
      where: { id: sequenceId },
      update: { value: { increment: 1 } },
      create: { id: sequenceId, value: 1 },
    });
    return seq.value;
  }

  async create(
    data: CreateStudentDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve AcademicYear — use provided or fall back to active year
      let academicYearId = data.academicYearId;
      if (!academicYearId) {
        const activeYear = await tx.academicYear.findFirst({ where: { isActive: true } });
        if (!activeYear) {
          // Last resort: pick any year
          const anyYear = await tx.academicYear.findFirst({ orderBy: { name: 'desc' } });
          if (!anyYear) throw new BadRequestException('Tidak ada Tahun Ajaran tersedia. Buat Tahun Ajaran terlebih dahulu.');
          academicYearId = anyYear.id;
        } else {
          academicYearId = activeYear.id;
        }
      }

      const academicYear = await tx.academicYear.findUnique({
        where: { id: academicYearId },
      });
      const year = academicYear
        ? parseInt(academicYear.name.split('/')[0])
        : new Date().getFullYear();
      
      const angkatan = data.angkatan || year;

      // 2. Auto-generate registrationNumber and nisSekolah if empty
      let registrationNumber = data.registrationNumber;
      if (!registrationNumber) {
        const nextVal = await this.getNextSequenceValue(tx, `PPDB_${year}`);
        registrationNumber = `PPDB-${year}-${String(nextVal).padStart(4, '0')}`;
      }

      let nisSekolah = data.nisSekolah;
      if (!nisSekolah) {
        const nextVal = await this.getNextSequenceValue(tx, `NIS_${year}`);
        nisSekolah = `NIS-${year}-${String(nextVal).padStart(4, '0')}`;
      }

      // 3. Generate TM-XXXX ID (TM = Tata Murid, sequential per year)
      const tmSeq = await this.getNextSequenceValue(tx, `TM_${year}`);
      const studentId = `TM-${year}-${String(tmSeq).padStart(4, '0')}`;

      // 4. Create Student (provide defaults for optional DB-required fields)
      const student = await tx.student.create({
        data: {
          id: studentId,
          nisn: data.nisn || null,
          nisSekolah,
          registrationNumber,
          angkatan,
          nama: data.nama,
          kelas: data.kelas || '-',
          jurusan: data.jurusan || '-',
          email: data.email || '',
          telepon: data.telepon || '-',
          alamat: data.alamat,
          tanggalLahir: new Date(data.tanggalLahir),
          catatan: data.catatan || null,
          academicYearId,
          graduationYear: data.graduationYear ? Number(data.graduationYear) : null,
          certificateNumber: data.certificateNumber || null,
          nik: data.nik || null,
          nomorKK: data.nomorKK || null,
          namaPanggilan: data.namaPanggilan || null,
          jenisKelamin: data.jenisKelamin || null,
          tempatLahir: data.tempatLahir || null,
          asalSekolah: data.asalSekolah || null,
          tahunLulusSebelumnya: data.tahunLulusSebelumnya ? Number(data.tahunLulusSebelumnya) : null,
          anakKe: data.anakKe ? Number(data.anakKe) : null,
          jumlahSaudara: data.jumlahSaudara ? Number(data.jumlahSaudara) : null,
          photoUrl: data.photoUrl || null,
          status: (data.status as any) || 'AKTIF',
          updatedAt: new Date(),
        },
      });

      // 5. Create Guardian
      await tx.guardian.create({
        data: {
          id: randomUUID(),
          studentId: student.id,
          namaAyah: data.namaAyah || null,
          pekerjaanAyah: data.pekerjaanAyah || null,
          ktpAyah: data.ktpAyah || null,
          teleponAyah: data.teleponAyah || null,
          namaIbu: data.namaIbu || null,
          pekerjaanIbu: data.pekerjaanIbu || null,
          ktpIbu: data.ktpIbu || null,
          teleponIbu: data.teleponIbu || null,
          teleponOrangTua: data.teleponOrangTua || null,
          alamatOrangTua: data.alamatOrangTua || null,
          pendidikanAyah: data.pendidikanAyah || null,
          pendidikanIbu: data.pendidikanIbu || null,
          statusAyah: data.statusAyah || 'MASIH_HIDUP',
          statusIbu: data.statusIbu || 'MASIH_HIDUP',
          namaWali: data.namaWali || null,
          hubunganWali: data.hubunganWali || null,
          teleponWali: data.teleponWali || null,
          alamatWali: data.alamatWali || null,
        },
      });

      // Record initial status history
      await tx.studentStatusHistory.create({
        data: {
          id: randomUUID(),
          studentId: student.id,
          status: student.status,
          changedById: actor.id,
          reason: 'Pendaftaran siswa baru',
        },
      });

      // Record timeline event
      await tx.studentTimeline.create({
        data: {
          id: randomUUID(),
          studentId: student.id,
          event: 'Pendaftaran',
          details: `Siswa baru didaftarkan dengan status awal ${student.status} oleh ${actor.name}`,
        },
      });

      await tx.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: actor.id,
          action: 'CREATE_STUDENT',
          category: 'SISWA',
          entityType: 'Student',
          entityId: student.id,
          details: `Created student "${student.nama}" (NIS Sekolah: ${nisSekolah}, PPDB: ${registrationNumber})`,
        },
      });

      const res = await tx.student.findUnique({
        where: { id: student.id },
        include: { Guardian: true, Document: true, AcademicYear: true },
      });
      return this.minimizeStudentPii(res, actor);
    });
  }

  async update(
    id: string,
    data: UpdateStudentDto,
    actor: Actor,
  ) {
    const existing = await this.prisma.student.findUnique({
      where: { id },
      include: { Guardian: true }
    });
    if (!existing || existing.deletedAt) throw new NotFoundException('Student not found');

    return this.prisma.$transaction(async (tx) => {
      // Extract guardian fields
      const {
        namaAyah, pekerjaanAyah, ktpAyah, teleponAyah,
        namaIbu, pekerjaanIbu, ktpIbu, teleponIbu,
        teleponOrangTua, alamatOrangTua,
        pendidikanAyah, pendidikanIbu, statusAyah, statusIbu,
        namaWali, hubunganWali, teleponWali, alamatWali,
        documents, // Ignore if sent in update
        createdAt,
        ...studentFields
      } = data as any;

      // Prepare student updates
      const studentUpdateData: Record<string, any> = {};
      
      if (studentFields.nama !== undefined) studentUpdateData.nama = studentFields.nama;
      if (studentFields.nisn !== undefined) studentUpdateData.nisn = studentFields.nisn || null;
      if (studentFields.nisSekolah !== undefined) studentUpdateData.nisSekolah = studentFields.nisSekolah || null;
      if (studentFields.registrationNumber !== undefined) studentUpdateData.registrationNumber = studentFields.registrationNumber || null;
      if (studentFields.kelas !== undefined) studentUpdateData.kelas = studentFields.kelas;
      if (studentFields.jurusan !== undefined) studentUpdateData.jurusan = studentFields.jurusan;
      if (studentFields.email !== undefined) studentUpdateData.email = studentFields.email;
      if (studentFields.telepon !== undefined) studentUpdateData.telepon = studentFields.telepon;
      if (studentFields.alamat !== undefined) studentUpdateData.alamat = studentFields.alamat;
      if (studentFields.tanggalLahir !== undefined) studentUpdateData.tanggalLahir = new Date(studentFields.tanggalLahir);
      if (studentFields.catatan !== undefined) studentUpdateData.catatan = studentFields.catatan || null;
      if (studentFields.status !== undefined) studentUpdateData.status = studentFields.status;
      if (studentFields.graduationYear !== undefined) studentUpdateData.graduationYear = studentFields.graduationYear ? Number(studentFields.graduationYear) : null;
      if (studentFields.certificateNumber !== undefined) studentUpdateData.certificateNumber = studentFields.certificateNumber || null;
      if (studentFields.nik !== undefined) studentUpdateData.nik = studentFields.nik || null;
      if (studentFields.nomorKK !== undefined) studentUpdateData.nomorKK = studentFields.nomorKK || null;
      if (studentFields.namaPanggilan !== undefined) studentUpdateData.namaPanggilan = studentFields.namaPanggilan || null;
      if (studentFields.jenisKelamin !== undefined) studentUpdateData.jenisKelamin = studentFields.jenisKelamin || null;
      if (studentFields.tempatLahir !== undefined) studentUpdateData.tempatLahir = studentFields.tempatLahir || null;
      if (studentFields.asalSekolah !== undefined) studentUpdateData.asalSekolah = studentFields.asalSekolah || null;
      if (studentFields.tahunLulusSebelumnya !== undefined) studentUpdateData.tahunLulusSebelumnya = studentFields.tahunLulusSebelumnya ? Number(studentFields.tahunLulusSebelumnya) : null;
      if (studentFields.anakKe !== undefined) studentUpdateData.anakKe = studentFields.anakKe ? Number(studentFields.anakKe) : null;
      if (studentFields.jumlahSaudara !== undefined) studentUpdateData.jumlahSaudara = studentFields.jumlahSaudara ? Number(studentFields.jumlahSaudara) : null;
      if (studentFields.photoUrl !== undefined) studentUpdateData.photoUrl = studentFields.photoUrl || null;

      // Handle academicYearId updates & update angkatan accordingly
      if (studentFields.academicYearId !== undefined) {
        studentUpdateData.academicYearId = studentFields.academicYearId;
        const academicYear = await tx.academicYear.findUnique({
          where: { id: studentFields.academicYearId },
        });
        if (academicYear) {
          studentUpdateData.angkatan = parseInt(academicYear.name.split('/')[0]);
        }
      }

      studentUpdateData.updatedAt = new Date();

      // Update Student
      const student = await tx.student.update({
        where: { id },
        data: studentUpdateData,
      });

      // Update/Upsert Guardian
      await tx.guardian.upsert({
        where: { studentId: id },
        update: {
          namaAyah: namaAyah !== undefined ? namaAyah || null : undefined,
          pekerjaanAyah: pekerjaanAyah !== undefined ? pekerjaanAyah || null : undefined,
          ktpAyah: ktpAyah !== undefined ? ktpAyah || null : undefined,
          teleponAyah: teleponAyah !== undefined ? teleponAyah || null : undefined,
          namaIbu: namaIbu !== undefined ? namaIbu || null : undefined,
          pekerjaanIbu: pekerjaanIbu !== undefined ? pekerjaanIbu || null : undefined,
          ktpIbu: ktpIbu !== undefined ? ktpIbu || null : undefined,
          teleponIbu: teleponIbu !== undefined ? teleponIbu || null : undefined,
          teleponOrangTua: teleponOrangTua !== undefined ? teleponOrangTua || null : undefined,
          alamatOrangTua: alamatOrangTua !== undefined ? alamatOrangTua || null : undefined,
          pendidikanAyah: pendidikanAyah !== undefined ? pendidikanAyah || null : undefined,
          pendidikanIbu: pendidikanIbu !== undefined ? pendidikanIbu || null : undefined,
          statusAyah: statusAyah !== undefined ? statusAyah : undefined,
          statusIbu: statusIbu !== undefined ? statusIbu : undefined,
          namaWali: namaWali !== undefined ? namaWali || null : undefined,
          hubunganWali: hubunganWali !== undefined ? hubunganWali || null : undefined,
          teleponWali: teleponWali !== undefined ? teleponWali || null : undefined,
          alamatWali: alamatWali !== undefined ? alamatWali || null : undefined,
        },
        create: {
          id: randomUUID(),
          studentId: id,
          namaAyah: namaAyah || null,
          pekerjaanAyah: pekerjaanAyah || null,
          ktpAyah: ktpAyah || null,
          teleponAyah: teleponAyah || null,
          namaIbu: namaIbu || null,
          pekerjaanIbu: pekerjaanIbu || null,
          ktpIbu: ktpIbu || null,
          teleponIbu: teleponIbu || null,
          teleponOrangTua: teleponOrangTua || null,
          alamatOrangTua: alamatOrangTua || null,
          pendidikanAyah: pendidikanAyah || null,
          pendidikanIbu: pendidikanIbu || null,
          statusAyah: statusAyah || 'MASIH_HIDUP',
          statusIbu: statusIbu || 'MASIH_HIDUP',
          namaWali: namaWali || null,
          hubunganWali: hubunganWali || null,
          teleponWali: teleponWali || null,
          alamatWali: alamatWali || null,
        },
      });

      // Audit Log Diffs
      const diffs: { field: string; old: any; new: any }[] = [];
      const addDiff = (field: string, oldVal: any, newVal: any) => {
        let normalizedOld = oldVal === undefined || oldVal === '' ? null : oldVal;
        let normalizedNew = newVal === undefined || newVal === '' ? null : newVal;
        if (normalizedOld instanceof Date) normalizedOld = normalizedOld.toISOString();
        if (normalizedNew instanceof Date) normalizedNew = normalizedNew.toISOString();
        if (normalizedOld !== normalizedNew) {
          diffs.push({ field, old: normalizedOld, new: normalizedNew });
        }
      };

      addDiff('nama', existing.nama, student.nama);
      addDiff('nisn', existing.nisn, student.nisn);
      addDiff('nisSekolah', existing.nisSekolah, student.nisSekolah);
      addDiff('registrationNumber', existing.registrationNumber, student.registrationNumber);
      addDiff('kelas', existing.kelas, student.kelas);
      addDiff('jurusan', existing.jurusan, student.jurusan);
      addDiff('email', existing.email, student.email);
      addDiff('telepon', existing.telepon, student.telepon);
      addDiff('alamat', existing.alamat, student.alamat);
      addDiff('tanggalLahir', existing.tanggalLahir, student.tanggalLahir);
      addDiff('catatan', existing.catatan, student.catatan);
      addDiff('status', existing.status, student.status);
      addDiff('graduationYear', existing.graduationYear, student.graduationYear);
      addDiff('certificateNumber', existing.certificateNumber, student.certificateNumber);
      addDiff('academicYearId', existing.academicYearId, student.academicYearId);
      addDiff('nik', existing.nik, student.nik);
      addDiff('nomorKK', existing.nomorKK, student.nomorKK);
      addDiff('namaPanggilan', existing.namaPanggilan, student.namaPanggilan);
      addDiff('jenisKelamin', existing.jenisKelamin, student.jenisKelamin);
      addDiff('tempatLahir', existing.tempatLahir, student.tempatLahir);
      addDiff('asalSekolah', existing.asalSekolah, student.asalSekolah);
      addDiff('tahunLulusSebelumnya', existing.tahunLulusSebelumnya, student.tahunLulusSebelumnya);
      addDiff('anakKe', existing.anakKe, student.anakKe);
      addDiff('jumlahSaudara', existing.jumlahSaudara, student.jumlahSaudara);
      addDiff('photoUrl', existing.photoUrl, student.photoUrl);

      if (namaAyah !== undefined) addDiff('namaAyah', existing.Guardian?.namaAyah, namaAyah);
      if (pekerjaanAyah !== undefined) addDiff('pekerjaanAyah', existing.Guardian?.pekerjaanAyah, pekerjaanAyah);
      if (ktpAyah !== undefined) addDiff('ktpAyah', existing.Guardian?.ktpAyah, ktpAyah);
      if (teleponAyah !== undefined) addDiff('teleponAyah', existing.Guardian?.teleponAyah, teleponAyah);
      if (namaIbu !== undefined) addDiff('namaIbu', existing.Guardian?.namaIbu, namaIbu);
      if (pekerjaanIbu !== undefined) addDiff('pekerjaanIbu', existing.Guardian?.pekerjaanIbu, pekerjaanIbu);
      if (ktpIbu !== undefined) addDiff('ktpIbu', existing.Guardian?.ktpIbu, ktpIbu);
      if (teleponIbu !== undefined) addDiff('teleponIbu', existing.Guardian?.teleponIbu, teleponIbu);
      if (teleponOrangTua !== undefined) addDiff('teleponOrangTua', existing.Guardian?.teleponOrangTua, teleponOrangTua);
      if (alamatOrangTua !== undefined) addDiff('alamatOrangTua', existing.Guardian?.alamatOrangTua, alamatOrangTua);
      if (pendidikanAyah !== undefined) addDiff('pendidikanAyah', existing.Guardian?.pendidikanAyah, pendidikanAyah);
      if (pendidikanIbu !== undefined) addDiff('pendidikanIbu', existing.Guardian?.pendidikanIbu, pendidikanIbu);
      if (statusAyah !== undefined) addDiff('statusAyah', existing.Guardian?.statusAyah, statusAyah);
      if (statusIbu !== undefined) addDiff('statusIbu', existing.Guardian?.statusIbu, statusIbu);
      if (namaWali !== undefined) addDiff('namaWali', existing.Guardian?.namaWali, namaWali);
      if (hubunganWali !== undefined) addDiff('hubunganWali', existing.Guardian?.hubunganWali, hubunganWali);
      if (teleponWali !== undefined) addDiff('teleponWali', existing.Guardian?.teleponWali, teleponWali);
      if (alamatWali !== undefined) addDiff('alamatWali', existing.Guardian?.alamatWali, alamatWali);

      // Check if status changed
      if (studentFields.status !== undefined && studentFields.status !== existing.status) {
        const changeReason = data.reason || 'Pembaruan status kesiswaan';
        await tx.studentStatusHistory.create({
          data: {
            id: randomUUID(),
            studentId: student.id,
            status: student.status,
            changedById: actor.id,
            reason: changeReason,
          },
        });

        await tx.studentTimeline.create({
          data: {
            id: randomUUID(),
            studentId: student.id,
            event: 'Mutasi Status',
            details: `Status diubah dari ${existing.status} ke ${student.status}. Alasan: ${changeReason}`,
          },
        });
      }

      // Check if class changed
      if (studentFields.kelas !== undefined && studentFields.kelas !== existing.kelas) {
        await tx.studentTimeline.create({
          data: {
            id: randomUUID(),
            studentId: student.id,
            event: 'Mutasi Kelas',
            details: `Kelas diubah dari "${existing.kelas}" ke "${student.kelas}"`,
          },
        });
      }

      // If neither status nor class changed, but update occurred, record generic update
      const statusChanged = studentFields.status !== undefined && studentFields.status !== existing.status;
      const classChanged = studentFields.kelas !== undefined && studentFields.kelas !== existing.kelas;
      if (!statusChanged && !classChanged) {
        await tx.studentTimeline.create({
          data: {
            id: randomUUID(),
            studentId: student.id,
            event: 'Pembaruan Data',
            details: `Biodata siswa diperbarui oleh ${actor.name}`,
          },
        });
      }

      const auditDetails = {
        before: {} as Record<string, any>,
        after: {} as Record<string, any>,
      };
      for (const diff of diffs) {
        auditDetails.before[diff.field] = diff.old;
        auditDetails.after[diff.field] = diff.new;
      }

      await tx.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: actor.id,
          action: 'UPDATE_STUDENT',
          category: 'SISWA',
          entityType: 'Student',
          entityId: student.id,
          details: `Updated student "${student.nama}". Changes: ${JSON.stringify(auditDetails)}`,
        },
      });

      const res = await tx.student.findUnique({
        where: { id: student.id },
        include: { Guardian: true, Document: true, AcademicYear: true },
      });
      return this.minimizeStudentPii(res, actor);
    });
  }

  async softDelete(id: string, actor: Actor) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Student not found');

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.update({
        where: { id },
        data: { 
          status: 'CUTI', 
          deletedAt: new Date(), 
          deletedBy: actor.id,
          updatedAt: new Date() 
        },
      });

      await tx.guardian.updateMany({
        where: { studentId: id },
        data: {
          deletedAt: new Date(),
          deletedBy: actor.id,
        }
      });

      await tx.document.updateMany({
        where: { studentId: id },
        data: {
          deletedAt: new Date(),
          deletedBy: actor.id,
        }
      });

      await tx.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: actor.id,
          action: 'DELETE_STUDENT',
          category: 'SISWA',
          entityType: 'Student',
          entityId: student.id,
          details: `Soft-deleted student "${existing.nama}" (NIS Sekolah: ${existing.nisSekolah})`,
        },
      });

      return student;
    });
  }

  async findAcademicYears() {
    return this.prisma.academicYear.findMany({
      orderBy: { name: 'desc' },
    });
  }

  async createAcademicYear(name: string) {
    const existing = await this.prisma.academicYear.findUnique({
      where: { name },
    });
    if (existing) {
      throw new BadRequestException('Academic year already exists');
    }
    return this.prisma.academicYear.create({
      data: {
        name,
        isActive: false,
      },
    });
  }

  async updateAcademicYear(id: string, data: { name?: string; isActive?: boolean }) {
    const existing = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Academic year not found');
    }

    if (data.name) {
      const name = data.name.trim();
      const duplicate = await this.prisma.academicYear.findFirst({
        where: { name, NOT: { id } },
      });
      if (duplicate) {
        throw new BadRequestException('Academic year with this name already exists');
      }
      return this.prisma.academicYear.update({
        where: { id },
        data: { name },
      });
    }

    if (data.isActive !== undefined) {
      if (data.isActive) {
        return this.setActiveAcademicYear(id);
      } else {
        // Enforce that we cannot deactivate the only active year
        if (existing.isActive) {
          throw new BadRequestException('Harus ada minimal satu Tahun Ajaran yang aktif. Aktifkan Tahun Ajaran lainnya terlebih dahulu.');
        }
        return this.prisma.academicYear.update({
          where: { id },
          data: { isActive: false },
        });
      }
    }
    return existing;
  }

  async setActiveAcademicYear(id: string) {
    const existing = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Academic year not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Set all other active years to false
      await tx.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Set target active year to true
      return tx.academicYear.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }

  async deleteAcademicYear(id: string) {
    const existing = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Academic year not found');
    }

    // Check if there are any students in this academic year
    const studentCount = await this.prisma.student.count({
      where: { academicYearId: id },
    });
    if (studentCount > 0) {
      throw new BadRequestException(
        'Cannot delete academic year that has students registered to it',
      );
    }

    // If we delete the active year, ensure we set another one active if exists
    if (existing.isActive) {
      const another = await this.prisma.academicYear.findFirst({
        where: { NOT: { id } },
      });
      if (another) {
        await this.prisma.academicYear.update({
          where: { id: another.id },
          data: { isActive: true },
        });
      }
    }

    return this.prisma.academicYear.delete({ where: { id } });
  }

  /**
   * Trash Bin — Liste tous les étudiants soft-deleted
   */
  async findTrash(actor?: Actor) {
    const trash = await this.prisma.student.findMany({
      where: { deletedAt: { not: null } },
      include: { Guardian: true, Document: true },
      orderBy: { deletedAt: 'desc' },
      // Opt out of the soft-delete middleware filter
      // @ts-expect-error - custom flag consumed by prisma.service middleware
      __includeDeleted: true,
    });
    return trash.map(s => this.minimizeStudentPii(s, actor));
  }

  /**
   * Restaure un étudiant soft-deleted (ainsi que son Guardian et ses Documents)
   */
  async restore(id: string, actor: Actor) {
    // findUnique filtered out soft-deleted; use __includeDeleted to bypass
    const student = await this.prisma.student.findUnique({
      where: { id },
      // @ts-expect-error - custom flag consumed by prisma.service middleware
      __includeDeleted: true,
    });
    if (!student) throw new NotFoundException('Student not found');
    if (!student.deletedAt) throw new BadRequestException('Student is not deleted');

    return this.prisma.$transaction(async (tx) => {
      const restored = await tx.student.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedBy: null,
          status: 'AKTIF',
          updatedAt: new Date(),
        },
      });

      // Restore guardian — use raw SQL to bypass soft-delete middleware
      await tx.$executeRawUnsafe(
        `UPDATE "Guardian" SET "deletedAt" = NULL, "deletedBy" = NULL WHERE "studentId" = $1`,
        id,
      );

      // Restore documents — use raw SQL to bypass soft-delete middleware
      await tx.$executeRawUnsafe(
        `UPDATE "Document" SET "deletedAt" = NULL, "deletedBy" = NULL WHERE "studentId" = $1`,
        id,
      );

      await tx.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: actor.id,
          action: 'RESTORE_STUDENT',
          category: 'SISWA',
          entityType: 'Student',
          entityId: restored.id,
          details: `Restored student "${restored.nama}" (NIS: ${restored.nisSekolah})`,
        },
      });

      return tx.student.findUnique({
        where: { id: restored.id },
        include: { Guardian: true, Document: true },
      });
    });
  }

  /**
   * Suppression définitive — hard delete l'étudiant ET ses fichiers
   */
  async permanentDelete(id: string, actor: Actor) {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can perform permanent deletion');
    }
    // findUnique filtered out soft-deleted; use __includeDeleted to bypass
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { Document: true },
      // @ts-expect-error - custom flag consumed by prisma.service middleware
      __includeDeleted: true,
    });
    if (!student) throw new NotFoundException('Student not found');

    // Collect file paths to delete AFTER transaction succeeds
    const filesToDelete = student.Document
      .map(doc => {
        if (!doc.storagePath) return null;
        return isAbsolute(doc.storagePath) ? doc.storagePath : join(UPLOADS_DIR, doc.storagePath);
      })
      .filter((filePath): filePath is string => !!filePath && existsSync(filePath));

    // Database transaction — delete records
    const result = await this.prisma.$transaction(async (tx) => {
      // Delete documents in DB
      await tx.document.deleteMany({ where: { studentId: id } });

      // Delete guardian
      await tx.guardian.deleteMany({ where: { studentId: id } });

      // Delete student
      await tx.student.delete({ where: { id } });

      await tx.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: actor.id,
          action: 'PERMANENT_DELETE_STUDENT',
          category: 'SISWA',
          entityType: 'Student',
          entityId: id,
          details: `Permanently deleted student "${student.nama}" (NIS: ${student.nisSekolah})`,
        },
      });

      return { message: `Student "${student.nama}" permanently deleted` };
    });

    // Delete physical files AFTER transaction committed successfully
    for (const filePath of filesToDelete) {
      try { unlinkSync(filePath); } catch { /* file already gone — safe to ignore */ }
    }

    return result;
  }

  /**
   * Global Search — recherche full-text sur les champs étudiants et parents
   * Cherche dans : nama, nisSekolah, nisn, registrationNumber,
   *               namaAyah, namaIbu, ktpAyah, ktpIbu
   */
  async search(query: string, actor?: Actor) {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    const sanitized = query.trim();

    const orConditions: any[] = [
      { nama: { contains: sanitized, mode: 'insensitive' } },
      { nisSekolah: { contains: sanitized, mode: 'insensitive' } },
      { nisn: { contains: sanitized, mode: 'insensitive' } },
      { registrationNumber: { contains: sanitized, mode: 'insensitive' } },
      { Guardian: { namaAyah: { contains: sanitized, mode: 'insensitive' } } },
      { Guardian: { namaIbu: { contains: sanitized, mode: 'insensitive' } } },
    ];
    // Only SUPER_ADMIN can search by KTP parent data (PII)
    if (actor?.role === 'SUPER_ADMIN') {
      orConditions.push(
        { Guardian: { ktpAyah: { contains: sanitized, mode: 'insensitive' } } },
        { Guardian: { ktpIbu: { contains: sanitized, mode: 'insensitive' } } },
      );
    }

    const results = await this.prisma.student.findMany({
      where: {
        deletedAt: null,
        OR: orConditions,
      },
      include: {
        Guardian: true,
        Document: { where: { isLatest: true, deletedAt: null }, take: 5 },
        AcademicYear: true,
      },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });
    return results.map(s => this.minimizeStudentPii(s, actor));
  }

  /**
   * Export tous les étudiants actifs en Excel (.xlsx)
   * Retourne un Buffer contenant le fichier Excel
   */
  async exportToExcel(actor?: Actor): Promise<Buffer> {
    const students = await this.prisma.student.findMany({
      where: { deletedAt: null },
      include: { Guardian: true, AcademicYear: true, Document: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'desc' },
    });

    if (actor) {
      await this.prisma.activityLog.create({
        data: {
          id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          actorUserId: actor.id,
          action: 'EXPORT_EXCEL',
          category: 'SISWA',
          entityType: 'Student',
          details: `Exported ${students.length} student records to Excel`,
        },
      });
    }

    const requirements = await this.prisma.documentRequirement.findMany({
      where: { isRequired: true },
    });
    const requiredTypes = requirements.map((r) => r.type);

    const workbook = new Workbook();

    const formatDateStr = (d?: string | Date | null): string => {
      if (!d) return '-';
      const date = new Date(d);
      if (isNaN(date.getTime())) return '-';
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    const formatIndoFullDate = (d?: string | Date | null): string => {
      if (!d) return '-';
      const date = new Date(d);
      if (isNaN(date.getTime())) return '-';
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const dateToday = formatIndoFullDate(new Date());

    const DB_STATUS_MAP: Record<string, string> = {
      PENDAFTAR: 'Pendaftar',
      AKTIF: 'Aktif',
      CUTI: 'Cuti',
      LULUS: 'Lulus',
      KELUAR: 'Keluar',
      ALUMNI: 'Alumni',
    };

    // -------------------------------------------------------------------------
    // SHEET 1: Ringkasan
    // -------------------------------------------------------------------------
    const ringkasanSheet = workbook.addWorksheet('Ringkasan');

    // Title / Kop
    ringkasanSheet.getCell('A1').value = 'PKBM TEKNOLOGI MUSTAQBAL';
    ringkasanSheet.getCell('A1').font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    
    ringkasanSheet.getCell('A2').value = 'LAPORAN DATA DAN KELENGKAPAN ARSIP SISWA';
    ringkasanSheet.getCell('A2').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF475569' } };
    
    ringkasanSheet.getCell('A3').value = `Tanggal Ekspor: ${dateToday}`;
    ringkasanSheet.getCell('A3').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };

    // Summary calculations
    const totalSiswa = students.length;
    const totalDocs = students.reduce((acc, s) => acc + (s.Document?.length || 0), 0);
    const totalArsip = students.reduce((acc, s) => acc + (s.Document?.filter(d => d.status === 'VERIFIED').length || 0), 0);

    const counts = {
      PENDAFTAR: 0,
      AKTIF: 0,
      ALUMNI: 0,
      LULUS: 0,
      KELUAR: 0,
      CUTI: 0,
      Lengkap: 0,
      BelumLengkap: 0,
      Verifikasi: 0,
      Ditolak: 0
    };

    for (const s of students) {
      if (s.status in counts) {
        counts[s.status as keyof typeof counts]++;
      } else {
        counts.AKTIF++; // fallback
      }
      
      const completeness = this.calculateCompletenessPercent(s, requiredTypes);
      if (completeness === 100) {
        counts.Lengkap++;
      } else {
        counts.BelumLengkap++;
      }

      if (s.Document) {
        for (const d of s.Document) {
          if (d.status === 'UPLOADED') counts.Verifikasi++;
          if (d.status === 'REJECTED') counts.Ditolak++;
        }
      }
    }

    const thinBorder: any = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    // Table 1: General Info
    ringkasanSheet.getCell('A5').value = 'Informasi Umum';
    ringkasanSheet.getCell('A5').font = { name: 'Arial', size: 11, bold: true };
    
    ringkasanSheet.getCell('A6').value = 'Nama Sekolah';
    ringkasanSheet.getCell('B6').value = 'PKBM Teknologi Mustaqbal';
    ringkasanSheet.getCell('A7').value = 'Tanggal Export';
    ringkasanSheet.getCell('B7').value = dateToday;
    ringkasanSheet.getCell('A8').value = 'Total Siswa';
    ringkasanSheet.getCell('B8').value = totalSiswa;
    ringkasanSheet.getCell('A9').value = 'Total Dokumen';
    ringkasanSheet.getCell('B9').value = totalDocs;
    ringkasanSheet.getCell('A10').value = 'Total Arsip (Verified)';
    ringkasanSheet.getCell('B10').value = totalArsip;

    // Table 2: Status Breakdown
    ringkasanSheet.getCell('A12').value = 'Keterangan Status';
    ringkasanSheet.getCell('B12').value = 'Jumlah';
    ringkasanSheet.getCell('A12').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    ringkasanSheet.getCell('B12').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    ringkasanSheet.getCell('A12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    ringkasanSheet.getCell('B12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

    const statusRows = [
      ['Total Siswa', totalSiswa],
      ['Pendaftar', counts.PENDAFTAR],
      ['Aktif', counts.AKTIF],
      ['Alumni', counts.ALUMNI],
      ['Lulus', counts.LULUS],
      ['Keluar', counts.KELUAR],
      ['Cuti', counts.CUTI],
      ['Arsip Lengkap', counts.Lengkap],
      ['Belum Lengkap', counts.BelumLengkap],
      ['Menunggu Verifikasi', counts.Verifikasi],
      ['Ditolak', counts.Ditolak]
    ];

    statusRows.forEach((row, i) => {
      const rIdx = 13 + i;
      ringkasanSheet.getCell(`A${rIdx}`).value = row[0];
      ringkasanSheet.getCell(`B${rIdx}`).value = row[1];
    });

    for (let r = 6; r <= 10; r++) {
      ringkasanSheet.getCell(`A${r}`).border = thinBorder;
      ringkasanSheet.getCell(`B${r}`).border = thinBorder;
      ringkasanSheet.getCell(`A${r}`).font = { name: 'Arial', size: 10 };
      ringkasanSheet.getCell(`B${r}`).font = { name: 'Arial', size: 10 };
    }

    for (let r = 12; r <= 23; r++) {
      ringkasanSheet.getCell(`A${r}`).border = thinBorder;
      ringkasanSheet.getCell(`B${r}`).border = thinBorder;
      if (r > 12) {
        ringkasanSheet.getCell(`A${r}`).font = { name: 'Arial', size: 10 };
        ringkasanSheet.getCell(`B${r}`).font = { name: 'Arial', size: 10 };
        ringkasanSheet.getCell(`B${r}`).alignment = { horizontal: 'center' };
      }
    }

    ringkasanSheet.getColumn(1).width = 28;
    ringkasanSheet.getColumn(2).width = 25;

    // Helper function to create standard tables in sheets 2 to 5
    const setupWorksheetHeaders = (ws: any, title: string, headers: string[]) => {
      ws.getCell('A1').value = 'PKBM TEKNOLOGI MUSTAQBAL';
      ws.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      
      ws.getCell('A2').value = `${title} - Tanggal Ekspor: ${dateToday}`;
      ws.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };

      const headerRow = ws.getRow(4);
      headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      
      headers.forEach((h: string, index: number) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = h;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' }, // Slate-800
        };
        cell.border = thinBorder;
      });

      ws.views = [{ state: 'frozen', ySplit: 4 }];
      ws.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4, column: headers.length }
      };
    };

    const applyDataBordersAndWidth = (ws: any, startRow: number, numCols: number, textColIndices: number[], centerColIndices: number[]) => {
      for (let r = startRow; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        row.height = 20;
        for (let c = 1; c <= numCols; c++) {
          const cell = row.getCell(c);
          cell.border = thinBorder;
          cell.font = { name: 'Arial', size: 9 };
          
          if (textColIndices.includes(c)) {
            cell.numFmt = '@';
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else if (centerColIndices.includes(c)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        }
      }

      ws.columns.forEach((column: any) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell: any) => {
          if (cell.row >= 4) {
            const val = cell.value;
            const columnLength = val ? String(val).length : 0;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          }
        });
        column.width = Math.max(maxLength + 3, 10);
      });
    };

    // -------------------------------------------------------------------------
    // SHEET 2: Data Siswa
    // -------------------------------------------------------------------------
    const dataSiswaSheet = workbook.addWorksheet('Biodata Siswa');
    const dataSiswaHeaders = [
      'ID Siswa', 'NIS Sekolah', 'NISN', 'Nama', 'Nama Panggilan', 'NIK', 'No. KK',
      'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Email', 'No. Telepon', 'Alamat',
      'Anak Ke', 'Jumlah Saudara', 'Status'
    ];
    setupWorksheetHeaders(dataSiswaSheet, 'DATA BIODATA SISWA', dataSiswaHeaders);

    students.forEach((s) => {
      dataSiswaSheet.addRow([
        s.id,
        s.nisSekolah ?? '',
        s.nisn ?? '',
        s.nama,
        s.namaPanggilan ?? '',
        s.nik ?? '',
        s.nomorKK ?? '',
        s.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : s.jenisKelamin === 'PEREMPUAN' ? 'Perempuan' : '',
        s.tempatLahir ?? '',
        s.tanggalLahir ? formatDateStr(s.tanggalLahir) : '',
        s.email,
        s.telepon,
        s.alamat,
        s.anakKe ?? '',
        s.jumlahSaudara ?? '',
        DB_STATUS_MAP[s.status] ?? s.status,
      ]);
    });
    applyDataBordersAndWidth(dataSiswaSheet, 5, dataSiswaHeaders.length, [1, 2, 3, 6, 7, 12], [1, 2, 3, 6, 7, 8, 10, 12, 14, 15, 16]);

    // -------------------------------------------------------------------------
    // SHEET 3: Akademik
    // -------------------------------------------------------------------------
    const akademikSheet = workbook.addWorksheet('Akademik');
    const akademikHeaders = [
      'ID Siswa', 'Nama', 'Tahun Ajaran', 'Angkatan', 'Kelas', 'Jurusan', 'Asal Sekolah', 'Tahun Lulus', 'No PPDB'
    ];
    setupWorksheetHeaders(akademikSheet, 'DATA AKADEMIK SISWA', akademikHeaders);

    students.forEach((s) => {
      akademikSheet.addRow([
        s.id,
        s.nama,
        s.AcademicYear?.name ?? '',
        s.angkatan,
        s.kelas,
        s.jurusan,
        s.asalSekolah ?? '',
        s.tahunLulusSebelumnya ?? '',
        s.registrationNumber ?? '',
      ]);
    });
    applyDataBordersAndWidth(akademikSheet, 5, akademikHeaders.length, [1, 9], [1, 3, 4, 5, 6, 8, 9]);

    // -------------------------------------------------------------------------
    // SHEET 4: Orang Tua & Wali
    // -------------------------------------------------------------------------
    const ortuSheet = workbook.addWorksheet('Orang Tua & Wali');
    const ortuHeaders = [
      'ID Siswa', 'Nama Siswa', 'Nama Ayah', 'HP Ayah', 'Pekerjaan Ayah', 'Pendidikan Ayah', 'Status Ayah',
      'Nama Ibu', 'HP Ibu', 'Pekerjaan Ibu', 'Pendidikan Ibu', 'Status Ibu',
      'Nama Wali', 'Hubungan Wali', 'HP Wali', 'Alamat Wali'
    ];
    setupWorksheetHeaders(ortuSheet, 'DATA ORANG TUA & WALI SISWA', ortuHeaders);

    students.forEach((s) => {
      ortuSheet.addRow([
        s.id,
        s.nama,
        s.Guardian?.namaAyah ?? '',
        s.Guardian?.teleponOrangTua || s.Guardian?.teleponAyah || '',
        s.Guardian?.pekerjaanAyah ?? '',
        s.Guardian?.pendidikanAyah ?? '',
        s.Guardian?.statusAyah === 'MENINGGAL' ? 'Wafat' : 'Masih Hidup',
        s.Guardian?.namaIbu ?? '',
        s.Guardian?.teleponOrangTua || s.Guardian?.teleponIbu || '',
        s.Guardian?.pekerjaanIbu ?? '',
        s.Guardian?.pendidikanIbu ?? '',
        s.Guardian?.statusIbu === 'MENINGGAL' ? 'Wafat' : 'Masih Hidup',
        s.Guardian?.namaWali ?? '',
        s.Guardian?.hubunganWali ?? '',
        s.Guardian?.teleponWali ?? '',
        s.Guardian?.alamatWali ?? '',
      ]);
    });
    applyDataBordersAndWidth(ortuSheet, 5, ortuHeaders.length, [1, 4, 9, 17], [1, 4, 7, 9, 12, 17]);

    // -------------------------------------------------------------------------
    // SHEET 5: Kelengkapan Dokumen
    // -------------------------------------------------------------------------
    const kelengkapanSheet = workbook.addWorksheet('Kelengkapan Dokumen');
    
    kelengkapanSheet.getCell('A1').value = 'PKBM TEKNOLOGI MUSTAQBAL';
    kelengkapanSheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    
    kelengkapanSheet.getCell('A2').value = `STATUS KELENGKAPAN DOKUMEN SISWA - Tanggal Ekspor: ${dateToday}`;
    kelengkapanSheet.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };

    // Legend
    kelengkapanSheet.getCell('A4').value = 'Keterangan Status:   ✅ = Terverifikasi  |  🟡 = Menunggu Verifikasi  |  ❌ = Ditolak  |  - = Belum Upload';
    kelengkapanSheet.getCell('A4').font = { name: 'Arial', size: 9, italic: true, bold: true, color: { argb: 'FF475569' } };

    const kelHeaders = [
      'ID Siswa', 'Nama Siswa', 'KK', 'Akta', 'Ijazah', 'SKL', 'Pas Foto', 'Rapor', 
      'KTP Ayah', 'KTP Ibu', 'Surat Pindah', 'Sertifikat', 'Prakerin', 'Pendukung',
      'Status Kelengkapan', 'Persentase'
    ];

    const headerRow5 = kelengkapanSheet.getRow(6);
    headerRow5.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow5.alignment = { vertical: 'middle', horizontal: 'center' };
    
    kelHeaders.forEach((h: string, index: number) => {
      const cell = headerRow5.getCell(index + 1);
      cell.value = h;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.border = thinBorder;
    });

    kelengkapanSheet.views = [{ state: 'frozen', ySplit: 6 }];
    kelengkapanSheet.autoFilter = {
      from: { row: 6, column: 1 },
      to: { row: 6, column: kelHeaders.length }
    };

    const getDocSymbol = (docs: any[], type: string): string => {
      const doc = docs.find(d => d.type === type && d.isLatest);
      if (!doc) return '-';
      if (doc.status === 'VERIFIED') return '✅';
      if (doc.status === 'UPLOADED') return '🟡';
      if (doc.status === 'REJECTED') return '❌';
      return '-';
    };

    students.forEach((s) => {
      const docs = s.Document ?? [];
      const percentage = this.calculateCompletenessPercent(s, requiredTypes);
      const statusLabel = percentage === 100 ? 'Lengkap' : 'Belum Lengkap';

      kelengkapanSheet.addRow([
        s.id,
        s.nama,
        getDocSymbol(docs, 'KK'),
        getDocSymbol(docs, 'AKTA'),
        getDocSymbol(docs, 'IJAZAH_TERAKHIR'),
        getDocSymbol(docs, 'SKL'),
        getDocSymbol(docs, 'PAS_FOTO'),
        getDocSymbol(docs, 'RAPORT'),
        getDocSymbol(docs, 'KTP_AYAH'),
        getDocSymbol(docs, 'KTP_IBU'),
        getDocSymbol(docs, 'SURAT_PINDAH'),
        getDocSymbol(docs, 'SERTIFIKAT'),
        getDocSymbol(docs, 'PRAKERIN'),
        getDocSymbol(docs, 'PENDUKUNG'),
        statusLabel,
        `${percentage}%`,
      ]);
    });

    applyDataBordersAndWidth(kelengkapanSheet, 7, kelHeaders.length, [1], [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  async exportToCsv(actor?: Actor): Promise<string> {
    const students = await this.prisma.student.findMany({
      where: { deletedAt: null },
      include: { Guardian: true, AcademicYear: true, Document: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'desc' },
    });

    if (actor) {
      await this.prisma.activityLog.create({
        data: {
          id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          actorUserId: actor.id,
          action: 'EXPORT_CSV',
          category: 'SISWA',
          entityType: 'Student',
          details: `Exported ${students.length} student records to CSV`,
        },
      });
    }

    const requirements = await this.prisma.documentRequirement.findMany({
      where: { isRequired: true },
    });
    const requiredTypes = requirements.map((r) => r.type);

    const headers = [
      'ID Siswa', 'NISN', 'Nama', 'Kelas', 'Jurusan', 'Status',
      'Email', 'No HP', 'Alamat', 'Kelengkapan', 'Persentase'
    ];

    const escapeCsv = (val: string | null | undefined): string => {
      const s = (val ?? '').toString();
      // Prevent CSV formula injection (cells starting with =, +, -, @)
      let escaped = s;
      if (/^[=+\-@\t\r]/.test(escaped)) {
        escaped = "'" + escaped;
      }
      if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
        return `"${escaped.replace(/"/g, '""')}"`;
      }
      return escaped;
    };

    const DB_STATUS_MAP: Record<string, string> = {
      PENDAFTAR: 'Pendaftar',
      AKTIF: 'Aktif',
      CUTI: 'Cuti',
      LULUS: 'Lulus',
      KELUAR: 'Keluar',
      ALUMNI: 'Alumni',
    };

    const rows = students.map((s) => {
      const docs = s.Document ?? [];
      const percentage = this.calculateCompletenessPercent(s, requiredTypes);
      const mappedStatus = DB_STATUS_MAP[s.status] ?? s.status;

      const requiredDocsCount = docs.filter(d => requiredTypes.includes(d.type) && d.status === 'VERIFIED').length;
      const totalRequiredCount = requiredTypes.length;
      const kelengkapanStr = `${requiredDocsCount}/${totalRequiredCount}`;

      return [
        escapeCsv(s.id),
        escapeCsv(s.nisn),
        escapeCsv(s.nama),
        escapeCsv(s.kelas),
        escapeCsv(s.jurusan),
        escapeCsv(mappedStatus),
        escapeCsv(s.email),
        escapeCsv(s.telepon),
        escapeCsv(s.alamat),
        escapeCsv(kelengkapanStr),
        `${percentage}%`,
      ].join(',');
    });

    return headers.join(',') + '\n' + rows.join('\n');
  }

  async findTimeline(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.deletedAt) throw new NotFoundException('Student not found');

    return this.prisma.studentTimeline.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findStatusHistory(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.deletedAt) throw new NotFoundException('Student not found');

    return this.prisma.studentStatusHistory.findMany({
      where: { studentId },
      include: {
        ChangedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findNotes(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.deletedAt) throw new NotFoundException('Student not found');

    return this.prisma.studentNote.findMany({
      where: { studentId },
      include: {
        Author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async createNote(
    studentId: string,
    authorId: string,
    data: { content: string; visibility?: 'INTERNAL' | 'PUBLIC'; isPinned?: boolean },
  ) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.deletedAt) throw new NotFoundException('Student not found');

    return this.prisma.studentNote.create({
      data: {
        id: randomUUID(),
        studentId,
        authorId,
        content: data.content,
        visibility: data.visibility || 'INTERNAL',
        isPinned: data.isPinned || false,
      },
      include: {
        Author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updateNote(
    noteId: string,
    data: { content?: string; visibility?: 'INTERNAL' | 'PUBLIC'; isPinned?: boolean },
  ) {
    const existing = await this.prisma.studentNote.findUnique({ where: { id: noteId } });
    if (!existing) throw new NotFoundException('Note not found');

    return this.prisma.studentNote.update({
      where: { id: noteId },
      data: {
        content: data.content !== undefined ? data.content : undefined,
        visibility: data.visibility !== undefined ? data.visibility : undefined,
        isPinned: data.isPinned !== undefined ? data.isPinned : undefined,
      },
      include: {
        Author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async deleteNote(noteId: string) {
    const existing = await this.prisma.studentNote.findUnique({ where: { id: noteId } });
    if (!existing) throw new NotFoundException('Note not found');

    await this.prisma.studentNote.delete({ where: { id: noteId } });
    return { message: 'Note deleted successfully' };
  }

  async findDocumentRequirements() {
    return this.prisma.documentRequirement.findMany({
      orderBy: { type: 'asc' },
    });
  }

  async updateDocumentRequirement(id: string, isRequired: boolean) {
    const existing = await this.prisma.documentRequirement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Document requirement not found');

    return this.prisma.documentRequirement.update({
      where: { id },
      data: { isRequired },
    });
  }

  /**
   * Auto-purge cron job: runs daily at 02:00 WIB.
   * Permanently deletes students that have been in trash for 30+ days,
   * along with all their associated documents and activity logs.
   */
  @Cron('0 2 * * *', { timeZone: 'Asia/Jakarta' })
  async autoPurgeTrash(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.logger.log(`[AutoPurge] Running trash cleanup. Purging students deleted before ${cutoff.toISOString()}`);

    const staleStudents = await this.prisma.student.findMany({
      where: {
        deletedAt: { not: null, lt: cutoff },
      },
      include: { Document: { select: { id: true } } },
    });

    if (staleStudents.length === 0) {
      this.logger.log('[AutoPurge] No students to purge.');
      return;
    }

    let purgedCount = 0;
    for (const student of staleStudents) {
      try {
        // Delete documents (DB rows — BYTEA data is cascade deleted by Prisma)
        await this.prisma.document.deleteMany({ where: { studentId: student.id } });
        // Delete student record
        await this.prisma.student.delete({ where: { id: student.id } });
        purgedCount++;
        this.logger.log(`[AutoPurge] Permanently deleted student ${student.id} (${student.nama})`);
      } catch (err: any) {
        this.logger.error(`[AutoPurge] Failed to purge student ${student.id}: ${err.message}`);
      }
    }

    this.logger.log(`[AutoPurge] Finished. Purged ${purgedCount}/${staleStudents.length} students.`);
  }
}

