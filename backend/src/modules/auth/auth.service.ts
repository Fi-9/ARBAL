import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

// Refresh token JWT expiry (7 days)
const REFRESH_TOKEN_EXPIRY = '7d';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

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
   * Signs a REFRESH token (7 days) containing only the user id.
   * The `type: 'refresh'` claim prevents it from being used as an access token.
   */
  private signRefreshToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_EXPIRY },
    );
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { Role: true } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const accessToken = this.signAccessToken(user.id, user.email, user.Role.name);
    const refreshToken = this.signRefreshToken(user.id);

    // Log successful login
    await this.prisma.activityLog.create({
      data: {
        id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        actorUserId: user.id,
        action: 'LOGIN',
        category: 'AUTENTIKASI',
        entityType: 'User',
        entityId: user.id,
        details: `User "${user.name}" logged in`,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.Role.name,
      },
    };
  }

  /**
   * Validates a refresh token and issues a new access token.
   * Throws if the token is invalid, expired, or not a refresh-type token.
   */
  async refresh(rawRefreshToken: string) {
    // 1. Verify JWT signature + expiry
    let payload: { sub: string; type?: string };
    try {
      payload = this.jwtService.verify(rawRefreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Ensure it is a refresh token (not an access token reused)
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token is not a valid refresh token');
    }

    // 3. Look up user and confirm they are still active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { Role: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('User account is inactive');

    // 4. Issue new token pair (rotation)
    const accessToken = this.signAccessToken(user.id, user.email, user.Role.name);
    const newRefreshToken = this.signRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.Role.name,
      },
    };
  }

  /**
   * Logs a logout event. Called by the controller before clearing the cookie.
   */
  async logLogout(userId: string) {
    await this.prisma.activityLog.create({
      data: {
        id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
