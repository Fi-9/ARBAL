import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalStudents,
      activeStudents,
      alumniStudents,
      perAngkatanRaw,
      perJurusanRaw,
      perStatusRaw,
      totalDocuments,
      recentActivity,
    ] = await Promise.all([
      // Total non-deleted students
      this.prisma.student.count({ where: { deletedAt: null } }),
      // Active students
      this.prisma.student.count({ where: { deletedAt: null, status: 'AKTIF' } }),
      // Alumni
      this.prisma.student.count({ where: { deletedAt: null, status: 'ALUMNI' } }),
      // Per angkatan (top 10)
      this.prisma.student.groupBy({
        by: ['angkatan'],
        where: { deletedAt: null },
        _count: { id: true },
        orderBy: { angkatan: 'desc' },
        take: 10,
      }),
      // Per jurusan
      this.prisma.student.groupBy({
        by: ['jurusan'],
        where: { deletedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      // Per status (all statuses)
      this.prisma.student.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      // Total documents (non-deleted, latest)
      this.prisma.document.count({
        where: { deletedAt: null, isLatest: true },
      }),
      // Recent activity (last 10)
      this.prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { User: { select: { name: true, email: true } } },
      }),
    ]);

    // Document completeness — how many students have at least 1 document per type
    const docTypes = await this.prisma.document.groupBy({
      by: ['type'],
      where: { deletedAt: null, isLatest: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Students with at least 1 document
    const studentsWithDocs = await this.prisma.document.groupBy({
      by: ['studentId'],
      where: { deletedAt: null, isLatest: true },
    });

    const completionRate = totalStudents > 0
      ? parseFloat(((studentsWithDocs.length / totalStudents) * 100).toFixed(1))
      : 0;

    return {
      totalStudents,
      activeStudents,
      alumniStudents,
      transferredStudents: perStatusRaw.find(s => s.status === 'KELUAR')?._count.id ?? 0,
      inactiveStudents: perStatusRaw.find(s => s.status === 'CUTI')?._count.id ?? 0,
      completionRate,
      studentsWithDocuments: studentsWithDocs.length,
      totalDocuments,
      perAngkatan: perAngkatanRaw.map(a => ({
        angkatan: a.angkatan,
        count: a._count.id,
      })),
      perJurusan: perJurusanRaw.map(j => ({
        jurusan: j.jurusan,
        count: j._count.id,
      })),
      perDocumentType: docTypes.map(d => ({
        type: d.type,
        count: d._count.id,
      })),
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        action: a.action,
        category: a.category,
        entityType: a.entityType,
        details: a.details,
        actor: a.User.name,
        createdAt: a.createdAt,
      })),
    };
  }
}
