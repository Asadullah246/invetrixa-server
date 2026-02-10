import { forwardRef, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionSerializer } from './serializers/session.serializer';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenants/tenants.module';
import { LocalStrategy } from './strategies/local.strategy';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import { MfaService } from './mfa/mfa.service';
import { AccessControlModule } from '../access-control/access-control.module';
import { EmailModule } from '@/common/services/email-service/email.module';

@Module({
  imports: [
    PassportModule.register({ session: true }),
    UsersModule,
    forwardRef(() => TenantsModule),
    forwardRef(() => AccessControlModule),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionSerializer,
    LocalStrategy,
    LocalAuthGuard,
    AuthenticatedGuard,
    MfaService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
