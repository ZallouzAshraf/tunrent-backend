import { Response } from 'express';
import { RoleGlobal } from '../../common/enums';

export const REFRESH_COOKIE = 'tunrent_rt';
export const LOGGED_IN_COOKIE = 'tunrent_logged_in';
export const HOME_COOKIE = 'tunrent_home';

export interface AuthCookieContext {
  role: string;
  agencyId?: string | null;
}

export function resolveHomePath(ctx: AuthCookieContext): string {
  if (ctx.role === RoleGlobal.SUPER_ADMIN) {
    return '/admin';
  }
  if (ctx.agencyId) {
    return '/dashboard';
  }
  return '/account';
}

export function setAuthCookies(
  res: Response,
  refreshToken: string,
  expiresAt: Date,
  ctx?: AuthCookieContext,
): void {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/auth',
    expires: expiresAt,
  });

  res.cookie(LOGGED_IN_COOKIE, '1', {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  if (ctx) {
    res.cookie(HOME_COOKIE, resolveHomePath(ctx), {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
  }
}

export function clearAuthCookies(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  const base = { secure: isProd, sameSite: 'lax' as const };

  res.clearCookie(REFRESH_COOKIE, { ...base, path: '/auth', httpOnly: true });
  res.clearCookie(LOGGED_IN_COOKIE, { ...base, path: '/' });
  res.clearCookie(HOME_COOKIE, { ...base, path: '/' });
}
