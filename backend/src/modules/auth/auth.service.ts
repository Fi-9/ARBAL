import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

// Refresh token JWT expiry (7 days)
const REFRESH_TOKEN_EXPIRY = '7d';
// DB expiry slightly longer than JWT to allow clock skew
const REFRESH_DB_EXPIRY_MS = 8 * 24 * 60 * 60 * 1000; // 8 days

// Account lockout settings
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/** SHA-256 hash a raw token for safe DB storage */
function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

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
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async getPermissionsForRole(roleName: string): Promise<string[]> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'ROLE_PERMISSIONS' },
      });
      if (setting) {
        const mapping = JSON.parse(setting.value);
        return mapping[roleName] ?? ROLE_PERMISSIONS[roleName] ?? [];
      }
    } catch (err: any) {
      console.error('Failed to load dynamic permissions in auth service:', err.message);
    }
    return ROLE_PERMISSIONS[roleName] ?? [];
  }

  /**
   * Signs an ACCESS token (15 min) containing identity + role claims.
   */
  private signAccessToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign(
      { sub: userId, email, role },
      { expiresIn: '15m' },
    );
  }

  /**
   * Signs a REFRESH token (7 days) containing user id + a unique jti.
   * Uses a separate secret (JWT_REFRESH_SECRET) for defense-in-depth.
   */
  private signRefreshToken(userId: string, jti: string): string {
    return this.jwtService.sign(
      { sub: userId, type: 'refresh', jti },
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        secret: process.env.JWT_REFRESH_SECRET,
      },
    );
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { Role: true } });
    if (!user || user.deletedAt) {
      await this.prisma.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: 'SYSTEM',
          action: 'LOGIN_FAILED',
          category: 'AUTENTIKASI',
          entityType: 'User',
          details: `Failed login attempt for non-existent email: "${email}"`,
        },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.prisma.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: user.id,
          action: 'LOGIN_FAILED',
          category: 'AUTENTIKASI',
          entityType: 'User',
          entityId: user.id,
          details: `Failed login attempt: account "${email}" is inactive`,
        },
      });
      throw new UnauthorizedException('Account is inactive');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60_000);
      await this.prisma.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: user.id,
          action: 'LOGIN_FAILED',
          category: 'AUTENTIKASI',
          entityType: 'User',
          entityId: user.id,
          details: `Failed login attempt: account "${email}" is locked`,
        },
      });
      throw new UnauthorizedException(
        `Account is locked due to too many failed login attempts. Try again in ${remainingMin} minute(s).`,
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // Increment failed login counter
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const updateData: any = { failedLoginAttempts: attempts };

      // Lock account after MAX_FAILED_ATTEMPTS
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      await this.prisma.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: user.id,
          action: 'LOGIN_FAILED',
          category: 'AUTENTIKASI',
          entityType: 'User',
          entityId: user.id,
          details: `Failed login attempt: invalid password for account "${email}"`,
        },
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed login counter on successful login
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const accessToken = this.signAccessToken(user.id, user.email, user.Role.name);

    // Create refresh token with family tracking for rotation detection
    const jti = randomUUID();
    const family = randomUUID();
    const refreshToken = this.signRefreshToken(user.id, jti);
    const expiresAt = new Date(Date.now() + REFRESH_DB_EXPIRY_MS);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        family,
        expiresAt,
      },
    });

    // Log successful login
    await this.prisma.activityLog.create({
      data: {
        id: `LOG_${randomUUID()}`,
        actorUserId: user.id,
        action: 'LOGIN_SUCCESS',
        category: 'AUTENTIKASI',
        entityType: 'User',
        entityId: user.id,
        details: `User "${user.name}" logged in successfully`,
      },
    });

    const permissions = await this.getPermissionsForRole(user.Role.name);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.Role.name,
        permissions,
      },
    };
  }

  /**
   * Validates a refresh token and issues a new access token.
   *
   * Rotation strategy (family-based):
   *   1. Verify JWT signature + expiry
   *   2. Hash raw token and look up in RefreshToken table
   *   3. If token not found or revoked → REJECT (replay attack detected)
   *   4. Revoke ALL tokens in the same family (rotation)
   *   5. Issue new token pair with same family
   */
  async refresh(rawRefreshToken: string) {
    // 1. Verify JWT signature + expiry using the refresh-specific secret
    let payload: { sub: string; type?: string; jti?: string };
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Ensure it is a refresh token (not an access token reused)
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token is not a valid refresh token');
    }

    // 3. Hash and look up in DB
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token not recognized');
    }

    if (stored.revokedAt) {
      // Replay attack detected — revoke ALL tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has been revoked — possible token theft');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // 4. Revoke the whole family (rotation on use)
    await this.prisma.refreshToken.updateMany({
      where: { family: stored.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // 5. Look up user and confirm they are still active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { Role: true },
    });
    if (!user || !user.isActive || user.deletedAt) throw new UnauthorizedException('User account is inactive');

    // 6. Issue new token pair (keep same family for rotation chain)
    const newJti = randomUUID();
    const accessToken = this.signAccessToken(user.id, user.email, user.Role.name);
    const newRefreshToken = this.signRefreshToken(user.id, newJti);
    const expiresAt = new Date(Date.now() + REFRESH_DB_EXPIRY_MS);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(newRefreshToken),
        userId: user.id,
        family: stored.family,
        expiresAt,
      },
    });

    const permissions = await this.getPermissionsForRole(user.Role.name);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.Role.name,
        permissions,
      },
    };
  }

  /**
   * Revokes all active refresh tokens for a user (logout).
   */
  async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Securely logs out a user by verifying the refresh token's signature,
   * then revoking all active refresh tokens for the user and logging the event.
   */
  async logout(rawRefreshToken: string) {
    let payload: { sub: string; type?: string };
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      // Signature verification failed or token expired — skip revocation, just return
      return;
    }

    if (payload?.type === 'refresh' && payload?.sub) {
      await this.revokeAllUserTokens(payload.sub);
      await this.prisma.activityLog.create({
        data: {
          id: `LOG_${randomUUID()}`,
          actorUserId: payload.sub,
          action: 'LOGOUT',
          category: 'AUTENTIKASI',
          entityType: 'User',
          entityId: payload.sub,
          details: `User logged out`,
        },
      });
    }
  }

  /**
   * Logs a logout event directly by user ID.
   */
  async logLogout(userId: string) {
    await this.revokeAllUserTokens(userId);
    await this.prisma.activityLog.create({
      data: {
        id: `LOG_${randomUUID()}`,
        actorUserId: userId,
        action: 'LOGOUT',
        category: 'AUTENTIKASI',
        entityType: 'User',
        entityId: userId,
        details: `User logged out`,
      },
    });
  }
}
