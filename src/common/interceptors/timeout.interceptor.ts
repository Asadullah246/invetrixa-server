import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly timeoutMs = 30000; // 30 seconds

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    return new Observable((observer) => {
      const timeout = setTimeout(() => {
        this.logger.warn(
          `Request timeout: ${request.method} ${request.url} exceeded ${this.timeoutMs}ms`,
        );
        observer.error(new Error('Request timeout'));
      }, this.timeoutMs);

      const subscription = next.handle().subscribe({
        next: (value: unknown) => {
          clearTimeout(timeout);
          observer.next(value);
        },
        error: (err: Error) => {
          clearTimeout(timeout);
          observer.error(err);
        },
        complete: () => {
          clearTimeout(timeout);
          observer.complete();
        },
      });

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    });
  }
}
