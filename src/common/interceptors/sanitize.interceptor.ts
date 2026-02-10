import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class SanitizeResponseInterceptor implements NestInterceptor {
  private readonly sensitiveFields = [
    'password',
    'passwordHash',
    'salt',
    'token',
    'refreshToken', // Sanitized: tokens are stored in httpOnly cookies, not in response
    'accessToken', // Sanitized: tokens are stored in httpOnly cookies, not in response
    'secret',
    'apiKey',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data: unknown) => this.sanitize(data)));
  }

  private sanitize(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item: unknown) => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      const dataRecord = data as Record<string, unknown>;

      for (const key of Object.keys(dataRecord)) {
        if (this.sensitiveFields.includes(key)) {
          continue; // Skip sensitive fields
        } else if (
          typeof dataRecord[key] === 'object' &&
          dataRecord[key] !== null
        ) {
          sanitized[key] = this.sanitize(dataRecord[key]);
        } else {
          sanitized[key] = dataRecord[key];
        }
      }

      return sanitized;
    }

    return data;
  }
}
