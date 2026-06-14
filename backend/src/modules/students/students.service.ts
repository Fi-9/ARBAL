import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Shape of the authenticated user injected by JwtStrategy */
interface Actor {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.student.findMany({
      include: {
        Guardian: true,
        Document: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { Guardian: true, Document: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async create(
    data: {
      id: string;
      nisn: string;
      nama: string;
      kelas: string;
      jurusan: string;
      email: string;
      telepon: string;
      alamat: string;
      tanggalLahir: string;
      catatan?: string;
    },
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          id: data.id,
          nisn: data.nisn,
          nama: data.nama,
          kelas: data.kelas,
          jurusan: data.jurusan,
          email: data.email,
          telepon: data.telepon,
          alamat: data.alamat,
          tanggalLahir: new Date(data.tanggalLahir),
          catatan: data.catatan,
          updatedAt: new Date(),
        },
        include: { Guardian: true, Document: true },
      });

      await tx.activityLog.create({
        data: {
          id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          actorUserId: actor.id,
          action: 'CREATE_STUDENT',
          category: 'SISWA',
          entityType: 'Student',
          entityId: student.id,
          details: `Created student "${student.nama}" (NISN: ${student.nisn})`,
        },
      });

      return student;
    });
  }

  async update(
    id: string,
    data: Partial<{
      nisn: string;
      nama: string;
      kelas: string;
      jurusan: string;
      email: string;
      telepon: string;
      alamat: string;
      tanggalLahir: string;
      catatan: string;
      status: string;
    }>,
    actor: Actor,
  ) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Student not found');

    const updateData: Record<string, unknown> = { ...data };
    if (data.tanggalLahir) updateData.tanggalLahir = new Date(data.tanggalLahir);
    updateData.updatedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.update({
        where: { id },
        data: updateData,
        include: { Guardian: true, Document: true },
      });

      await tx.activityLog.create({
        data: {
          id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          actorUserId: actor.id,
          action: 'UPDATE_STUDENT',
          category: 'SISWA',
          entityType: 'Student',
          entityId: student.id,
          details: `Updated student "${student.nama}" (NISN: ${student.nisn})`,
        },
      });

      return student;
    });
  }

  async softDelete(id: string, actor: Actor) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Student not found');

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.update({
        where: { id },
        data: { status: 'NON_AKTIF', updatedAt: new Date() },
      });

      await tx.activityLog.create({
        data: {
          id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          actorUserId: actor.id,
          action: 'DELETE_STUDENT',
          category: 'SISWA',
          entityType: 'Student',
          entityId: student.id,
          details: `Soft-deleted student "${existing.nama}" (NISN: ${existing.nisn})`,
        },
      });

      return student;
    });
  }
}
