import {
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleGlobal } from '../../common/enums';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AgencyUser } from '../agency-users/entities/agency-user.entity';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let refreshTokenRepo: jest.Mocked<Repository<RefreshToken>>;
  let jwtService: jest.Mocked<JwtService>;

  const activeUser: User = {
    id: 'user-1',
    email: 'client@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '',
    phone: null,
    roleGlobal: RoleGlobal.CLIENT,
    isActive: true,
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    activeUser.passwordHash = await bcrypt.hash('password123', 4);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AgencyUser),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((v) => v),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: { save: jest.fn(), create: jest.fn((v) => v) },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed-refresh-token'),
            verify: jest.fn(),
            decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.refreshExpiresIn': '7d',
                'app.frontendUrl': 'http://localhost:3001',
              };
              return map[key];
            }),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendWelcome: jest.fn(),
            sendVerificationEmail: jest.fn(),
            sendPasswordReset: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('rejects wrong password', async () => {
      userRepo.findOne.mockResolvedValue(activeUser);

      await expect(
        service.login({ email: activeUser.email, password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues session on valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(activeUser);
      userRepo.save.mockResolvedValue(activeUser);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      refreshTokenRepo.save.mockResolvedValue({} as RefreshToken);

      const result = await service.login({
        email: activeUser.email,
        password: 'password123',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });
  });

  describe('refreshFromCookie', () => {
    it('rotates a valid refresh token', async () => {
      const record = {
        userId: activeUser.id,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        agencyId: null,
      } as RefreshToken;

      jwtService.verify.mockReturnValue({
        sub: activeUser.id,
        email: activeUser.email,
        role: RoleGlobal.CLIENT,
      });
      refreshTokenRepo.findOne.mockResolvedValue(record);
      refreshTokenRepo.save.mockResolvedValue(record);
      userRepo.findOne.mockResolvedValue(activeUser);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');

      const result = await service.refreshFromCookie('raw-token');

      expect(result.accessToken).toBe('new-access');
      expect(record.revokedAt).toBeInstanceOf(Date);
    });

    it('revokes all sessions on refresh token reuse', async () => {
      const record = {
        userId: activeUser.id,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
        agencyId: null,
      } as RefreshToken;

      jwtService.verify.mockReturnValue({
        sub: activeUser.id,
        email: activeUser.email,
        role: RoleGlobal.CLIENT,
      });
      refreshTokenRepo.findOne.mockResolvedValue(record);
      refreshTokenRepo.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      } as never);

      await expect(service.refreshFromCookie('reused-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logoutFromCookie', () => {
    it('revokes the presented refresh token', async () => {
      const record = {
        userId: activeUser.id,
        tokenHash: 'hash',
        revokedAt: null,
      } as RefreshToken;

      refreshTokenRepo.findOne.mockResolvedValue(record);
      refreshTokenRepo.save.mockResolvedValue(record);

      const result = await service.logoutFromCookie('raw-token');

      expect(result.message).toContain('Logged out');
      expect(record.revokedAt).toBeInstanceOf(Date);
    });
  });
});
