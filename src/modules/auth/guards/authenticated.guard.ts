import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import {
  AuthService,
  SessionStateSnapshot,
  SessionUser,
} from '../auth.service';

@Injectable()
export class AuthenticatedGuard extends AuthGuard('session') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const activated = (await super.canActivate(context)) as boolean;

    if (!activated) {
      return false;
    }

    await this.ensureSessionUser(request);
    await this.authService.touchSessionCache(request);
    return true;
  }

  handleRequest<TUser>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    void info;
    void context;
    void status;
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }

    return user;
  }

  private async ensureSessionUser(request: Request): Promise<void> {
    const existing = request.user as SessionUser | undefined;
    if (existing) {
      return;
    }

    const snapshot = this.getSessionSnapshot(request);
    if (snapshot) {
      const hydrated = await this.authService.deserializeUser(
        snapshot.id,
        snapshot,
      );

      if (hydrated) {
        request.user = hydrated;
        return;
      }
    }

    throw new UnauthorizedException('User session not found.');
  }

  private getSessionSnapshot(request: Request): SessionStateSnapshot | null {
    const session = request.session as
      | { passport?: { user?: SessionStateSnapshot } }
      | undefined;
    const candidate = session?.passport?.user;
    if (
      candidate &&
      typeof candidate.id === 'string' &&
      candidate.id.length > 0
    ) {
      return candidate;
    }
    return null;
  }
}
