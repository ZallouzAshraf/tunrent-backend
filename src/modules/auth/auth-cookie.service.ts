import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { RoleGlobal } from '../../common/enums';
import { AUTH_COOKIE_NAMES } from '../../config/auth.config';

export const REFRESH_COOKIE = AUTH_COOKIE_NAMES.refresh;
export const LOGGED_IN_COOKIE = AUTH_COOKIE_NAMES.loggedIn;
export const HOME_COOKIE = AUTH_COOKIE_NAMES.home;

export interface AuthCookieContext {
  role: string;
  agencyId?: string | null;
}

@Injectable()
export class AuthCookieService {
  private readonly logger = new Logger(AuthCookieService.name);

  constructor(private readonly configService: ConfigService) {}

  resolveHomePath(ctx: AuthCookieContext): string {
    if (ctx.role === RoleGlobal.SUPER_ADMIN) {
      return '/admin';
    }
    if (ctx.agencyId) {
      return '/dashboard';
    }
    return '/account';
  }

  setAuthCookies(
    res: Response,
    refreshToken: string,
    expiresAt: Date,
    ctx?: AuthCookieContext,
  ): void {
    const paths = this.configService.get<{ refresh: string; root: string }>(
      'auth.paths',
    )!;
    const cookie = this.configService.get<{
      secure: boolean;
      sameSite: 'lax';
    }>('auth.cookie')!;
    const isProduction = this.configService.get<boolean>('auth.isProduction');

    this.logger.log(
      JSON.stringify({
        event: 'auth.cookies.set',
        isProduction,
        paths,
        secure: cookie.secure,
        cookies: [
          REFRESH_COOKIE,
          LOGGED_IN_COOKIE,
          ...(ctx ? [HOME_COOKIE] : []),
        ],
      }),
    );

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: paths.refresh,
      expires: expiresAt,
    });

    res.cookie(LOGGED_IN_COOKIE, '1', {
      httpOnly: false,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: paths.root,
      expires: expiresAt,
    });

    if (ctx) {
      res.cookie(HOME_COOKIE, this.resolveHomePath(ctx), {
        httpOnly: false,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        path: paths.root,
        expires: expiresAt,
      });
    }
  }

  clearAuthCookies(res: Response): void {
    const paths = this.configService.get<{ refresh: string; root: string }>(
      'auth.paths',
    )!;
    const cookie = this.configService.get<{
      secure: boolean;
      sameSite: 'lax';
    }>('auth.cookie')!;
    const base = { secure: cookie.secure, sameSite: cookie.sameSite };

    this.logger.log(JSON.stringify({ event: 'auth.cookies.clear', paths }));

    res.clearCookie(REFRESH_COOKIE, {
      ...base,
      path: paths.refresh,
      httpOnly: true,
    });
    res.clearCookie(LOGGED_IN_COOKIE, { ...base, path: paths.root });
    res.clearCookie(HOME_COOKIE, { ...base, path: paths.root });
  }
}
