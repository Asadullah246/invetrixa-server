import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const method = request.method;
    const url = request.url;
    const body = request.body as unknown;
    const query = request.query;
    const params = request.params;
    const startTime = Date.now();

    this.logger.debug(`Request Details:
      Method: ${method}
      URL: ${url}
      Body: ${JSON.stringify(body)}
      Query: ${JSON.stringify(query)}
      Params: ${JSON.stringify(params)}
    `);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.debug(`Response sent in ${duration}ms`);
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `Request failed after ${duration}ms: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}
