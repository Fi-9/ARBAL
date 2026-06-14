import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

// Role → permissions mapping (must stay in sync with frontend types.ts)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'student.read', 'student.write', 'student.delete',
    'document.upload', 'document.delete', 'document.verify',
    'role.manage', 'logs.view',
  ],
  STAFF_TU: [
    'student.read', 'student.write',
    'document.upload', 'document.verify',
    'logs.view',
  ],
  GURU: [
    'student.read',
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
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: payload.role,
      permissions: ROLE_PERMISSIONS[payload.role] ?? [],
    };
  }
}
