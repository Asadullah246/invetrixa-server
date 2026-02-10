import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';

import type { SessionUser, SessionStateSnapshot } from '../auth.service';
import { AuthService } from '../auth.service';

type SerializedUser = SessionStateSnapshot;

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }

  serializeUser(
    user: SessionUser,
    done: (err: Error | null, id?: SerializedUser) => void,
  ): void {
    const snapshot: SerializedUser = {
      id: user.id,
      requiresTwoFactor: user.requiresTwoFactor,
      twoFactorVerified: user.twoFactorVerified,
    };
    done(null, snapshot);
  }

  async deserializeUser(
    serialized: SerializedUser,
    done: (err: Error | null, user?: SessionUser | false) => void,
  ): Promise<void> {
    try {
      const user = await this.authService.deserializeUser(
        serialized.id,
        serialized,
      );

      if (!user) {
        // Return false to tell Passport to invalidate the session
        // This allows old/invalid sessions to be cleared gracefully
        done(null, false);
        return;
      }

      done(null, user);
    } catch (error) {
      done(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
