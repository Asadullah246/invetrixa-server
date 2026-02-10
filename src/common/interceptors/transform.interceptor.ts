import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';
import { Meta, SuccessResponse } from '@/common/interfaces/response.interface';

interface ResponseData {
  message?: string;
  data?: unknown;
  meta?: Meta;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: T | ResponseData): SuccessResponse<T> => {
        if (
          data &&
          typeof data === 'object' &&
          ('message' in data || 'data' in data || 'meta' in data)
        ) {
          const responseData: ResponseData = data;

          // Check if response only has message (no actual data)
          const hasOnlyMessage =
            'message' in responseData &&
            !('data' in responseData) &&
            !('meta' in responseData);

          return {
            statusCode: response.statusCode,
            success: true,
            message: responseData.message || 'Success',
            ...(responseData.meta && { meta: responseData.meta }),
            // Return null if response only has a message, otherwise return actual data
            data: hasOnlyMessage
              ? (null as T)
              : (this.serializeDates(
                  responseData.data === undefined ? data : responseData.data,
                ) as T),
          };
        }

        // Default: treat the whole response as data
        return {
          statusCode: response.statusCode,
          success: true,
          message: 'Success',
          data: this.serializeDates(data) as T,
        };
      }),
    );
  }

  /**
   * Recursively convert Date objects to ISO strings
   * This fixes the issue where Date objects serialize to {} in JSON
   */
  private serializeDates(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.serializeDates(item));
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.serializeDates(value);
      }
      return result;
    }

    return obj;
  }
}
