import { registerAs } from '@nestjs/config';

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, '');
}

/** Comma-separated CORS_ORIGINS and/or FRONTEND_URL; localhost added in dev. */
export function resolveCorsOrigins(nodeEnv?: string): string[] {
  const env = nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const raw =
    process.env.CORS_ORIGINS?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    'http://localhost:3001';

  const origins = raw
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  if (env !== 'production') {
    origins.push('http://localhost:3001', 'http://localhost:3000');
  }

  return [...new Set(origins)];
}

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  url: process.env.APP_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  corsOrigins: resolveCorsOrigins(process.env.NODE_ENV),
  throttleTtl: parseInt(process.env.THROTTLE_TTL || '60', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
}));
