import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from '@/modules/auth/auth.service';

type PassportLogInFn = (
  this: Request,
  user: SessionUser,
  done: (err?: unknown) => void,
) => void;

export const formatUnknownError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
};

export const getDeviceLabel = (request: Request): string | null => {
  //   const userAgent = request.headers['user-agent'];
  //   return typeof userAgent === 'string' ? userAgent : null;

  const header = request.get('x-device-name');
  if (header && header.trim().length > 0) {
    return header.trim().slice(0, 100);
  }
  return null;
};

export const persistSessionBase = async (
  request: Request,
  sessionUser: SessionUser,
): Promise<void> => {
  if (typeof request.logIn !== 'function') {
    throw new UnauthorizedException('Session support is not available.');
  }

  await new Promise<void>((resolve, reject) => {
    request.session.regenerate((err) => {
      if (err) {
        reject(err instanceof Error ? err : new Error(formatUnknownError(err)));
        return;
      }
      resolve();
    });
  });

  await new Promise<void>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    Reflect.apply(request.logIn as PassportLogInFn, request, [
      sessionUser,
      (error?: unknown) => {
        if (error) {
          reject(
            error instanceof Error
              ? error
              : new Error(formatUnknownError(error)),
          );
          return;
        }
        resolve();
      },
    ]);
  });
};
