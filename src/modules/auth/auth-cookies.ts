import { Response } from 'express';

export const REFRESH_COOKIE = 'tunrent_rt';
export const LOGGED_IN_COOKIE = 'tunrent_logged_in';

export function setAuthCookies(
  res: Response,
  refreshToken: string,
  expiresAt: Date,
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
}

export function clearAuthCookies(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  const base = { secure: isProd, sameSite: 'lax' as const };

  res.clearCookie(REFRESH_COOKIE, { ...base, path: '/auth', httpOnly: true });
  res.clearCookie(LOGGED_IN_COOKIE, { ...base, path: '/' });
}
