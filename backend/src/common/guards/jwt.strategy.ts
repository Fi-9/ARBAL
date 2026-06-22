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
    'backup.manage',
  ],
  GURU: [
    'student.read',
    'document.read',
    'document.download',
    'dashboard.view',
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

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: roleName,
      permissions: ROLE_PERMISSIONS[roleName] ?? [],
    };
  }
}
