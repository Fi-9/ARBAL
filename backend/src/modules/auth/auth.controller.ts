import { Controller, Post, Body, Res, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { Request, Response } from 'express';

/** Cookie options for the httpOnly refresh token */
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // set true in production with HTTPS
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password);

    // Set httpOnly refresh-token cookie (the ACTUAL refresh token, not access token)
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    // Only return access token + user to the client body (refresh token stays in cookie)
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (!rawRefreshToken) {
      return { accessToken: null };
    }

    // Delegate full JWT verification to the service
    const result = await this.authService.refresh(rawRefreshToken);

    // Rotate refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Best-effort: log the logout event if we can identify the user from the refresh cookie
    const rawRefreshToken = req.cookies?.refreshToken;
    if (rawRefreshToken) {
      try {
        const payload = JSON.parse(Buffer.from(rawRefreshToken.split('.')[1], 'base64').toString());
        if (payload?.sub) await this.authService.logLogout(payload.sub);
      } catch {
        // Token malformed or expired — skip logging, still clear session
      }
    }

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    return { message: 'Logged out' };
  }
}
