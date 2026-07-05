import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { LoginThrottle } from '../../common/decorators/login-throttle.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/roles.decorator';
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
  type AuthCookieContext,
} from './auth-cookies';
import { AuthService, type SessionResult } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailCodeDto } from './dto/verify-email-code.dto';

function requestMeta(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

function toLoginBody(result: {
  accessToken: string;
  user: object;
  agencyId?: string;
  agencyRole?: string;
}) {
  return {
    access_token: result.accessToken,
    user: result.user,
    ...(result.agencyId
      ? { agencyId: result.agencyId, agencyRole: result.agencyRole }
      : {}),
  };
}

function authCookieContext(result: SessionResult): AuthCookieContext {
  return {
    role: result.user.roleGlobal ?? 'client',
    agencyId: result.agencyId ?? null,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @LoginThrottle()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, requestMeta(req));
    console.log('[auth] POST /auth/login success — calling setAuthCookies', {
      userId: result.user.id ?? '(unknown)',
      email: result.user.email ?? '(unknown)',
    });
    setAuthCookies(
      res,
      result.refreshToken,
      result.refreshTokenExpiresAt,
      authCookieContext(result),
    );
    return toLoginBody(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    if (!rawToken) {
      clearAuthCookies(res);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const result = await this.authService.refreshFromCookie(
      rawToken,
      requestMeta(req),
    );
    setAuthCookies(
      res,
      result.refreshToken,
      result.refreshTokenExpiresAt,
      authCookieContext(result),
    );
    return toLoginBody(result);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutFromCookie(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(user.sub);
    clearAuthCookies(res);
    return { message: 'Logged out from all devices successfully' };
  }

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmailCode(@Body() dto: VerifyEmailCodeDto) {
    return this.authService.verifyEmailCode(dto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  @Public()
  @Get('verify-email/:token')
  verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}

@Controller('dashboard/auth')
export class DashboardAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @LoginThrottle()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async dashboardLogin(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.dashboardLogin(dto, requestMeta(req));

    if ('requiresAgencySelection' in result) {
      return result;
    }

    setAuthCookies(
      res,
      result.refreshToken,
      result.refreshTokenExpiresAt,
      authCookieContext(result),
    );
    return toLoginBody(result);
  }
}
