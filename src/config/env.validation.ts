const WEAK_SECRETS = new Set([
  'your-super-secret-key-change-in-production',
  'another-super-secret-refresh-key',
  'secret',
  'changeme',
  'tunrent',
]);

function isWeak(value: string | undefined): boolean {
  if (!value?.trim()) {
    return true;
  }

  return WEAK_SECRETS.has(value.trim().toLowerCase());
}

export function validateEnvironment(): void {
  const errors: string[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  if (isWeak(process.env.JWT_SECRET)) {
    errors.push('JWT_SECRET must be set to a strong random value');
  }

  if (isWeak(process.env.JWT_REFRESH_SECRET)) {
    errors.push('JWT_REFRESH_SECRET must be set to a strong random value');
  }

  if (isProd && isWeak(process.env.DB_PASSWORD)) {
    errors.push('DB_PASSWORD must not use a default value in production');
  }

  if (isProd && !process.env.FRONTEND_URL?.trim()) {
    errors.push('FRONTEND_URL is required in production');
  }

  if (isProd && !process.env.DB_HOST?.trim()) {
    errors.push('DB_HOST is required in production');
  }

  if (isProd && !process.env.COOKIE_PATH_PREFIX?.trim()) {
    errors.push(
      'COOKIE_PATH_PREFIX is required in production (e.g. /api/backend for Vercel proxy)',
    );
  }

  if (errors.length > 0) {
    const message = `Environment validation failed:\n- ${errors.join('\n- ')}`;
    if (isProd) {
      throw new Error(message);
    }
    console.warn(`[env] ${message}`);
  }
}
