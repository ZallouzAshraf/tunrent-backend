import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { AgencyUserStatus, RoleGlobal } from '../../common/enums';
import { isAgencyOperational } from '../../common/utils/agency-plan.util';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AgencyUser } from '../agency-users/entities/agency-user.entity';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFICATION_EXPIRY_MINUTES = 15;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: Partial<User>;
  agencyId?: string;
  agencyRole?: string;
}

export interface MeResponse {
  user: Partial<User>;
  agencyId?: string;
  agencyRole?: string;
}

export interface DashboardAgencyOption {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: string;
}

export interface DashboardAgencySelectionResponse {
  requiresAgencySelection: true;
  agencies: DashboardAgencyOption[];
}

export type DashboardLoginResult =
  | SessionResult
  | DashboardAgencySelectionResponse;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AgencyUser)
    private readonly agencyUserRepo: Repository<AgencyUser>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.purgeExpiredTokens();
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ message: string; email: string; user: Partial<User> }> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const verificationCode = this.generateVerificationCode();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      passwordHash,
      phone: dto.phone ?? null,
      roleGlobal: RoleGlobal.CLIENT,
      isEmailVerified: false,
      emailVerificationToken: this.hashToken(verificationCode),
      emailVerificationExpiresAt: this.addMinutes(
        EMAIL_VERIFICATION_EXPIRY_MINUTES,
      ),
    });

    const saved = await this.userRepo.save(user);
    await this.sendVerificationEmail(
      email,
      saved.firstName,
      verificationCode,
    );

    return {
      message: 'Registration successful. Please verify your email.',
      email,
      user: this.sanitizeUser(saved),
    };
  }

  async login(dto: LoginDto, meta: RequestMeta = {}): Promise<SessionResult> {
    const user = await this.validateCredentials(dto.email, dto.password);
    this.ensureClientEmailVerified(user);
    return this.createSession(user, {}, meta);
  }

  async dashboardLogin(
    dto: LoginDto,
    meta: RequestMeta = {},
  ): Promise<DashboardLoginResult> {
    const user = await this.validateCredentials(dto.email, dto.password);

    const memberships = await this.agencyUserRepo.find({
      where: { userId: user.id, status: AgencyUserStatus.ACTIVE },
      relations: { agency: true },
      order: { createdAt: 'ASC' },
    });

    const activeMemberships = memberships.filter((m) =>
      isAgencyOperational(m.agency),
    );

    if (activeMemberships.length === 0) {
      throw new UnauthorizedException(
        'You are not an active member of any agency',
      );
    }

    let membership = activeMemberships[0];

    if (dto.agencyId) {
      const selected = activeMemberships.find((m) => m.agencyId === dto.agencyId);
      if (!selected) {
        throw new UnauthorizedException('Not an active member of this agency');
      }
      membership = selected;
    } else if (activeMemberships.length > 1) {
      return {
        requiresAgencySelection: true,
        agencies: activeMemberships.map((m) => ({
          id: m.agencyId,
          name: m.agency.name,
          slug: m.agency.slug,
          logoUrl: m.agency.logoUrl,
          role: m.role,
        })),
      };
    }

    return this.createSession(
      user,
      { agencyId: membership.agencyId, agencyRole: membership.role },
      meta,
    );
  }

  async refreshFromCookie(
    rawToken: string,
    meta: RequestMeta = {},
  ): Promise<SessionResult> {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(rawToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(rawToken);
    const record = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (record.revokedAt) {
      await this.revokeAllUserTokens(record.userId);
      await this.logSecurityEvent(
        record.userId,
        'security.refresh_token_reuse_detected',
        meta,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    record.revokedAt = new Date();
    await this.refreshTokenRepo.save(record);

    return this.createSession(
      user,
      {
        agencyId: record.agencyId ?? payload.agencyId,
        agencyRole: payload.agencyRole,
      },
      meta,
    );
  }

  async logoutFromCookie(rawToken?: string): Promise<{ message: string }> {
    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      const record = await this.refreshTokenRepo.findOne({
        where: { tokenHash },
      });
      if (record && !record.revokedAt) {
        record.revokedAt = new Date();
        await this.refreshTokenRepo.save(record);
      }
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.revokeAllUserTokens(userId);
    return { message: 'Logged out from all devices successfully' };
  }

  async getMe(jwt: JwtPayload): Promise<MeResponse> {
    const user = await this.userRepo.findOne({ where: { id: jwt.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: this.sanitizeUser(user),
      ...(jwt.agencyId
        ? { agencyId: jwt.agencyId, agencyRole: jwt.agencyRole }
        : {}),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepo.findOne({ where: { email } });

    if (user) {
      const resetToken = randomBytes(32).toString('hex');
      user.passwordResetToken = this.hashToken(resetToken);
      user.passwordResetExpiresAt = this.addHours(PASSWORD_RESET_EXPIRY_HOURS);
      await this.userRepo.save(user);
      await this.sendPasswordResetEmail(user.email, user.firstName, resetToken);
    }

    return {
      message:
        'If an account exists with this email, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const user = await this.userRepo.findOne({
      where: { passwordResetToken: tokenHash },
    });

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await this.userRepo.save(user);
    await this.revokeAllUserTokens(user.id);

    return { message: 'Password reset successfully' };
  }

  async verifyEmailCode(
    dto: VerifyEmailCodeDto,
  ): Promise<{ message: string }> {
    const email = dto.email.toLowerCase().trim();
    const codeHash = this.hashToken(dto.code.trim());
    const user = await this.userRepo.findOne({ where: { email } });

    if (
      !user ||
      !user.emailVerificationToken ||
      user.emailVerificationToken !== codeHash ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    if (user.isEmailVerified) {
      return { message: 'Email already verified' };
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    await this.userRepo.save(user);

    const frontendUrl = this.configService.get<string>('app.frontendUrl')!;
    await this.mailService.sendWelcome(user.email, {
      firstName: user.firstName,
      frontendUrl,
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(
    dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepo.findOne({ where: { email } });

    if (user && !user.isEmailVerified) {
      const verificationCode = this.generateVerificationCode();
      user.emailVerificationToken = this.hashToken(verificationCode);
      user.emailVerificationExpiresAt = this.addMinutes(
        EMAIL_VERIFICATION_EXPIRY_MINUTES,
      );
      await this.userRepo.save(user);
      await this.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationCode,
      );
    }

    return {
      message:
        'If an unverified account exists with this email, a new code has been sent.',
    };
  }

  /** @deprecated Use verifyEmailCode instead */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);
    const user = await this.userRepo.findOne({
      where: { emailVerificationToken: tokenHash },
    });

    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    await this.userRepo.save(user);

    return { message: 'Email verified successfully' };
  }

  private async createSession(
    user: User,
    agencyContext: Pick<JwtPayload, 'agencyId' | 'agencyRole'>,
    meta: RequestMeta,
  ): Promise<SessionResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.roleGlobal,
      ...agencyContext,
    };

    const accessToken = await this.generateAccessToken(payload);
    const { refreshToken, expiresAt } =
      await this.issueRefreshToken(payload, meta);

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
      user: this.sanitizeUser(user),
      ...(agencyContext.agencyId
        ? {
            agencyId: agencyContext.agencyId,
            agencyRole: agencyContext.agencyRole,
          }
        : {}),
    };
  }

  private async issueRefreshToken(
    payload: JwtPayload,
    meta: RequestMeta,
  ): Promise<{ refreshToken: string; expiresAt: Date }> {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
    )!;

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        agencyId: payload.agencyId,
        agencyRole: payload.agencyRole,
      },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const decoded = this.jwtService.decode(refreshToken) as { exp?: number };
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : this.addDays(7);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: payload.sub,
        tokenHash: this.hashToken(refreshToken),
        agencyId: payload.agencyId ?? null,
        deviceInfo: this.summarizeUserAgent(meta.userAgent),
        ipAddress: meta.ip ?? null,
        expiresAt,
        revokedAt: null,
      }),
    );

    return { refreshToken, expiresAt };
  }

  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return user;
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  private async purgeExpiredTokens(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await this.refreshTokenRepo.delete({
      expiresAt: LessThan(cutoff),
    });

    if (result.affected) {
      this.logger.log(`Purged ${result.affected} expired refresh tokens`);
    }
  }

  private async logSecurityEvent(
    userId: string,
    action: string,
    meta: RequestMeta,
  ): Promise<void> {
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        userId,
        action,
        entityType: 'refresh_token',
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      }),
    );
    this.logger.warn(`Security event for user ${userId}: ${action}`);
  }

  private generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      agencyId: payload.agencyId,
      agencyRole: payload.agencyRole,
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private summarizeUserAgent(userAgent?: string): string | null {
    if (!userAgent) return null;
    return userAgent.length > 255 ? userAgent.slice(0, 255) : userAgent;
  }

  private addHours(hours: number): Date {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
  }

  private addDays(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private sanitizeUser(user: User): Partial<User> {
    const {
      passwordHash: _passwordHash,
      emailVerificationToken: _emailVerificationToken,
      passwordResetToken: _passwordResetToken,
      ...safe
    } = user;

    return safe;
  }

  private ensureClientEmailVerified(user: User): void {
    if (user.roleGlobal === RoleGlobal.CLIENT && !user.isEmailVerified) {
      throw new ForbiddenException('EMAIL_NOT_VERIFIED');
    }
  }

  private generateVerificationCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private addMinutes(minutes: number): Date {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }

  private async sendVerificationEmail(
    email: string,
    firstName: string,
    code: string,
  ): Promise<void> {
    await this.mailService.sendVerifyEmail(email, {
      firstName,
      verificationCode: code,
      expiresMinutes: EMAIL_VERIFICATION_EXPIRY_MINUTES,
    });
    this.logger.log(`Verification code sent to ${email}`);
  }

  private async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    await this.mailService.sendResetPassword(email, {
      firstName,
      resetUrl,
    });
    this.logger.log(`Password reset email sent to ${email}`);
  }
}
