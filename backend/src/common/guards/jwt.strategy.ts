import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// Role → permissions mapping (must stay in sync with frontend types.ts)
const ROLE_PERMISSIONS: Record<string, string[]> = {
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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { Role: true },
    });
    if (!user || !user.isActive || user.deletedAt) return null;

    // Use the role from the database (authoritative), not from JWT payload
    const roleName = user.Role?.name ?? payload.role;

    // Load dynamic permissions map from database system settings
    let permissions: string[] = [];
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'ROLE_PERMISSIONS' },
      });
      if (setting) {
        const mapping = JSON.parse(setting.value);
        permissions = mapping[roleName] ?? ROLE_PERMISSIONS[roleName] ?? [];
      } else {
        permissions = ROLE_PERMISSIONS[roleName] ?? [];
      }
    } catch (err: any) {
      console.error('Failed to load dynamic permissions, falling back to defaults:', err.message);
      permissions = ROLE_PERMISSIONS[roleName] ?? [];
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: roleName,
      permissions,
    };
  }
}
