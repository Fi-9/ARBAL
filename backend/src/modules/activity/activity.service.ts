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
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              Role: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.activityLog.count(),
    ]);

    return {
      data: data.map((log) => ({
        id: log.id,
        action: log.action,
        category: log.category,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        createdAt: log.createdAt.toISOString(),
        actorUserId: log.actorUserId,
        actorName: log.User?.name ?? 'Unknown',
        actorEmail: log.User?.email ?? '',
        actorRole: (log.User?.Role?.name as any) ?? 'Unknown',
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Internal-only: log an action performed by an authenticated user.
   * The actorUserId MUST come from a trusted source (e.g. req.user, JWT payload),
   * never from client request body.
   */
  async logFromUser(
    actorUserId: string,
    dto: {
      action: string;
      category: 'SISWA' | 'DOKUMEN' | 'HAK_AKSES' | 'AUTENTIKASI' | 'BACKUP';
      entityType: string;
      entityId?: string;
      details: string;
    },
  ) {
    return this.prisma.activityLog.create({
      data: {
        id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        actorUserId,
        action: dto.action,
        category: dto.category,
        entityType: dto.entityType,
        entityId: dto.entityId,
        details: dto.details,
      },
    });
  }

  /**
   * Internal-only: log a system-initiated event (e.g. scheduled backup).
   * Uses a known system user ID as the actor.
   */
  async logFromSystem(
    systemActorUserId: string,
    dto: {
      action: string;
      category: 'SISWA' | 'DOKUMEN' | 'HAK_AKSES' | 'AUTENTIKASI' | 'BACKUP';
      entityType: string;
      entityId?: string;
      details: string;
    },
  ) {
    return this.prisma.activityLog.create({
      data: {
        id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        actorUserId: systemActorUserId,
        action: dto.action,
        category: dto.category,
        entityType: dto.entityType,
        entityId: dto.entityId,
        details: dto.details,
      },
    });
  }
}
