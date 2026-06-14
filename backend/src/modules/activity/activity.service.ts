import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { User: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.activityLog.count(),
    ]);
    return { data, total, page, limit };
  }

  async create(dto: {
    id?: string;
    actorUserId?: string;
    action: string;
    category: 'SISWA' | 'DOKUMEN' | 'HAK_AKSES' | 'AUTENTIKASI';
    entityType: string;
    entityId?: string;
    details: string;
  }) {
    return this.prisma.activityLog.create({
      data: {
        id: dto.id ?? `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        actorUserId: dto.actorUserId ?? 'SYSTEM',
        action: dto.action,
        category: dto.category,
        entityType: dto.entityType,
        entityId: dto.entityId,
        details: dto.details,
      },
    });
  }
}
