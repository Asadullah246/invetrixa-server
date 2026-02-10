import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    // Add security headers not handled by helmet
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );

    // Log suspicious requests
    this.logSuspiciousActivity(req);

    next();
  }

  private logSuspiciousActivity(req: Request): void {
    const suspiciousPatterns = [
      /\.\./, // Path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /exec\(/i, // Code execution
      /eval\(/i, // Code execution
    ];

    const url = req.url.toLowerCase();
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const body = this.sanitizeBody(req.body);

    const suspicious = suspiciousPatterns.some(
      (pattern) =>
        pattern.test(url) || pattern.test(userAgent) || pattern.test(body),
    );

    if (suspicious) {
      this.logger.warn(
        JSON.stringify({
          type: 'suspicious_activity',
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }

  private sanitizeBody(body: unknown, depth = 0): string {
    if (!body || depth > 3) {
      return '';
    }

    if (Array.isArray(body)) {
      return body
        .slice(0, 10)
        .map((item) => this.sanitizeBody(item, depth + 1))
        .join(' ')
        .toLowerCase();
    }

    if (typeof body === 'object') {
      const entries = Object.entries(body as Record<string, unknown>)
        .slice(0, 20)
        .map(([key, value]) => {
          if (this.isSensitiveKey(key)) {
            return `${key}=[REDACTED]`;
          }
          if (typeof value === 'object') {
            return `${key}=${this.sanitizeBody(value, depth + 1)}`;
          }
          return `${key}=${this.sanitizeValue(value)}`;
        });
      return entries.join(' ').toLowerCase();
    }

    return this.sanitizeValue(body).toLowerCase();
  }

  private sanitizeValue(value: unknown): string {
    if (typeof value === 'string') {
      return value.slice(0, 128);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password',
      'passcode',
      'token',
      'secret',
      'authorization',
      'auth',
      'credential',
    ];
    return sensitiveKeys.includes(key.toLowerCase());
  }
}
