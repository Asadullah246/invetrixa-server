import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

type RequestUser = {
  id?: string;
};

type TrackedRequest = Request & {
  requestId?: string;
  startTime?: number;
  user?: RequestUser;
};

type RequestLogEntry = {
  requestId: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  type: 'request';
};

type ResponseLogEntry = {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  userId?: string;
  timestamp: string;
  type: 'response';
};

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware<
  TrackedRequest,
  Response
> {
  private readonly logger = new Logger('HTTP');

  use(req: TrackedRequest, res: Response, next: NextFunction): void {
    const existingRequestId =
      req.requestId || (req.headers['x-request-id'] as string | undefined);
    const requestId = existingRequestId ?? uuidv4();
    req.requestId = requestId;
    req.startTime = Date.now();

    const { method, originalUrl } = req;
    const ip = req.ip ?? '';
    const userAgent = req.get('user-agent') ?? '';

    const requestLog: RequestLogEntry = {
      requestId,
      method,
      url: originalUrl,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      type: 'request',
    };

    this.logger.log(JSON.stringify(requestLog));

    res.on('finish', () => {
      const { statusCode } = res;
      const duration =
        req.startTime !== undefined ? Date.now() - req.startTime : 0;
      const userId = req.user?.id;

      const responseLog: ResponseLogEntry = {
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration,
        timestamp: new Date().toISOString(),
        type: 'response',
      };

      if (userId) {
        responseLog.userId = userId;
      }

      this.logger.log(JSON.stringify(responseLog));
    });

    next();
  }
}
