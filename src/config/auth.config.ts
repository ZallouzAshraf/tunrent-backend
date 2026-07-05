import { registerAs } from '@nestjs/config';

/** Cookie names — keep in sync with tunrent-frontend src/lib/auth/constants.ts */
export const AUTH_COOKIE_NAMES = {
  refresh: 'tunrent_rt',
  loggedIn: 'tunrent_logged_in',
  home: 'tunrent_home',
} as const;

export default registerAs('auth', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const prefix = (process.env.COOKIE_PATH_PREFIX || '').replace(/\/$/, '');

  return {
    isProduction,
    cookiePathPrefix: prefix,
    paths: {
      refresh: prefix ? `${prefix}/auth` : '/auth',
      root: '/',
    },
    cookie: {
      sameSite: 'lax' as const,
      // Deliberate env split: http://localhost dev cannot use Secure cookies.
      // Production (HTTPS) always sets Secure. Documented in docs/AUTH.md.
      secure: isProduction,
    },
    names: AUTH_COOKIE_NAMES,
  };
});
