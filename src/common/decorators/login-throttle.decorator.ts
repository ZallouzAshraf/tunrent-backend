import { Throttle } from '@nestjs/throttler';

const isDev = process.env.NODE_ENV === 'development';
const loginLimit = parseInt(
  process.env.THROTTLE_LOGIN_LIMIT || (isDev ? '10' : '5'),
  10,
);
const loginTtl = parseInt(process.env.THROTTLE_LOGIN_TTL || '60000', 10);

/** Login endpoints throttle — configurable via THROTTLE_LOGIN_LIMIT / THROTTLE_LOGIN_TTL. */
export const LoginThrottle = () =>
  Throttle({ default: { limit: loginLimit, ttl: loginTtl } });
