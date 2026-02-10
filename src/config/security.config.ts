import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  session: {
    secret: process.env.SESSION_SECRET,
    secrets: process.env.SESSION_SECRETS,
    ttl: parseInt(process.env.SESSION_TTL_SECONDS ?? '604800', 10),
    sameSite: process.env.SESSION_COOKIE_SAMESITE || 'lax',
  },
  csrf: {
    secret: process.env.CSRF_SECRET,
    secretCookieName: process.env.CSRF_SECRET_COOKIE_NAME || '_csrf',
    tokenCookieName: process.env.CSRF_TOKEN_COOKIE_NAME || 'XSRF-TOKEN',
    headerName: process.env.CSRF_HEADER_NAME || 'x-csrf-token',
    sameSite: process.env.CSRF_COOKIE_SAMESITE || 'lax',
    ttl: parseInt(process.env.CSRF_TOKEN_TTL_SECONDS ?? '3600', 10),
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
  timeout: parseInt(process.env.REQUEST_TIMEOUT_MS ?? '0', 10),
}));
