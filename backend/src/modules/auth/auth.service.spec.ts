import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logout - Vulnerability & Security Protection', () => {
    it('should securely log out and revoke tokens if signature verification succeeds', async () => {
      const validToken = 'valid.jwt.token';
      const mockPayload = { sub: 'user-123', type: 'refresh' };
      
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.activityLog.create.mockResolvedValue({});

      await service.logout(validToken);

      expect(jwtService.verify).toHaveBeenCalledWith(validToken, expect.any(Object));
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', revokedAt: null },
        data: expect.any(Object),
      });
      expect(prismaService.activityLog.create).toHaveBeenCalled();
    });

    it('should NOT revoke any tokens or create activity logs if signature verification fails (Forged Token Attack)', async () => {
      const forgedToken = 'forged.malicious.jwt';
      
      // Simulate signature verification throwing an error (e.g. invalid signature)
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await service.logout(forgedToken);

      expect(jwtService.verify).toHaveBeenCalledWith(forgedToken, expect.any(Object));
      expect(prismaService.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(prismaService.activityLog.create).not.toHaveBeenCalled();
    });

    it('should NOT revoke tokens if token type is not "refresh"', async () => {
      const accessTokenUsedAsRefresh = 'access.jwt.token';
      const mockPayload = { sub: 'user-123', type: 'access' }; // invalid type
      
      mockJwtService.verify.mockReturnValue(mockPayload);

      await service.logout(accessTokenUsedAsRefresh);

      expect(jwtService.verify).toHaveBeenCalled();
      expect(prismaService.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
