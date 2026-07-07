import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** List all active users (excluding soft-deleted) */
  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        roleId: true,
        Role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get a single user by ID */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        roleId: true,
        Role: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Create a new user */
  async create(data: { name: string; email: string; password: string; roleName: string }, actorId: string) {
    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already in use');

    // Find role
    const role = await this.prisma.role.findUnique({ where: { name: data.roleName as any } });
    if (!role) throw new BadRequestException(`Role "${data.roleName}" not found`);

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        name: data.name,
        email: data.email,
        passwordHash,
        roleId: role.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        Role: { select: { id: true, name: true } },
      },
    });

    // Audit log
    await this.prisma.activityLog.create({
      data: {
        id: `LOG_${randomUUID()}`,
        actorUserId: actorId,
        action: 'CREATE_USER',
        category: 'HAK_AKSES',
        entityType: 'User',
        entityId: user.id,
        details: `Created user "${user.name}" with role ${data.roleName}`,
      },
    });

    return user;
  }

  /** Update user profile (name, email, role, isActive) */
  async update(id: string, data: { name?: string; email?: string; roleName?: string; isActive?: boolean }, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    // Prevent self-deactivation
    if (data.isActive === false && id === actorId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    const updateData: Record<string, any> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) {
      // Check email uniqueness
      const emailTaken = await this.prisma.user.findFirst({
        where: { email: data.email, id: { not: id } },
      });
      if (emailTaken) throw new ConflictException('Email already in use');
      updateData.email = data.email;
    }
    if (data.roleName !== undefined) {
      // Prevent self-role-downgrade
      if (id === actorId) {
        throw new BadRequestException('Cannot change your own role');
      }
      const role = await this.prisma.role.findUnique({ where: { name: data.roleName as any } });
      if (!role) throw new BadRequestException(`Role "${data.roleName}" not found`);
      updateData.roleId = role.id;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        Role: { select: { id: true, name: true } },
      },
    });

    // Audit log
    await this.prisma.activityLog.create({
      data: {
        id: `LOG_${randomUUID()}`,
        actorUserId: actorId,
        action: 'UPDATE_USER',
        category: 'HAK_AKSES',
        entityType: 'User',
        entityId: user.id,
        details: `Updated user "${user.name}". Changes: ${JSON.stringify(data)}`,
      },
    });

    return user;
  }

  /** Reset a user's password */
  async resetPassword(id: string, newPassword: string, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Revoke all refresh tokens (force re-login)
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Audit log
    await this.prisma.activityLog.create({
      data: {
        id: `LOG_${randomUUID()}`,
        actorUserId: actorId,
        action: 'RESET_PASSWORD',
        category: 'HAK_AKSES',
        entityType: 'User',
        entityId: id,
        details: `Password reset for user "${existing.name}" by admin`,
      },
    });

    return { message: `Password for "${existing.name}" has been reset` };
  }

  /** Soft-delete a user */
  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId,
        isActive: false,
      },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Audit log
    await this.prisma.activityLog.create({
      data: {
        id: `LOG_${randomUUID()}`,
        actorUserId: actorId,
        action: 'DELETE_USER',
        category: 'HAK_AKSES',
        entityType: 'User',
        entityId: id,
        details: `Deleted user "${existing.name}" (${existing.email})`,
      },
    });

    return { message: `User "${existing.name}" has been deleted` };
  }

  async getPermissions() {
    const defaultPermissions = {
      SUPER_ADMIN: [
        'student.read', 'student.write', 'student.delete',
        'document.read', 'document.upload', 'document.delete', 'document.verify',
        'role.manage', 'user.manage',
        'logs.view', 'dashboard.view', 'report.export', 'document.download',
        'backup.manage', 'restore.manage',
      ],
      GURU: [
        'student.read',
        'document.read',
        'document.download',
        'dashboard.view',
      ],
      KEPALA_SEKOLAH: [
        'student.read',
        'document.read',
        'document.download',
        'dashboard.view',
        'logs.view',
      ],
      TATA_USAHA: [
        'student.read', 'student.write', 'student.delete',
        'document.read', 'document.upload', 'document.delete', 'document.verify',
        'dashboard.view', 'document.download',
      ],
    };
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'ROLE_PERMISSIONS' },
    });
    if (!setting) {
      return defaultPermissions;
    }
    try {
      const parsed = JSON.parse(setting.value);
      return {
        ...defaultPermissions,
        ...parsed,
      };
    } catch {
      return defaultPermissions;
    }
  }

  async savePermissions(permissions: Record<string, string[]>, actorId: string) {
    const value = JSON.stringify(permissions);
    const updated = await this.prisma.systemSetting.upsert({
      where: { key: 'ROLE_PERMISSIONS' },
      update: { value },
      create: { key: 'ROLE_PERMISSIONS', value },
    });

    await this.prisma.activityLog.create({
      data: {
        id: `LOG_${randomUUID()}`,
        actorUserId: actorId,
        action: 'UPDATE_PERMISSIONS',
        category: 'HAK_AKSES',
        entityType: 'SystemSetting',
        entityId: updated.id,
        details: `Updated role permissions: ${value}`,
      },
    });

    return { success: true };
  }
}
