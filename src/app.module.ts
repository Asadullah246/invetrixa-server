import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { GlobalExceptionFilter } from './common/filter/http-exception.filter';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RedisModule } from './redis/redis.module';
import {
  LoggingInterceptor,
  SanitizeResponseInterceptor,
  TimeoutInterceptor,
  TransformInterceptor,
} from './common/interceptors';
import { validateEnv } from './config/env.validation';
import { ProductModule } from './modules/product/product.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { LocationModule } from './modules/location/location.module';
import { ModulesDefinitionModule } from './modules/modules-definition/modules-definition.module';
import { PackagesModule } from './modules/packages/packages.module';
import { UtilsModule } from './common/utils/utils.module';
import { BullModule } from '@nestjs/bullmq';
import { EmailModule } from './common/services/email-service/email.module';
import { OnboardingGuard } from './modules/auth/guards/onboarding.guard';
import { CategoryModule } from './modules/category/category.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { StockModule } from './modules/stock/stock.module';
import { CustomerModule } from './modules/customer/customer.module';
import { POSModule } from './modules/pos/pos.module';
import { InvoiceModule } from './modules/invoice/invoice.module';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import securityConfig from './config/security.config';
import emailConfig from './config/email.config';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        securityConfig,
        emailConfig,
      ],
      // Strict single-file approach: no fallbacks
      // App will fail fast if the required env file is missing
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.getOrThrow<number>('security.throttle.ttl'),
            limit: configService.getOrThrow<number>('security.throttle.limit'),
          },
        ],
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          ...(configService.get<string>('REDIS_URL')
            ? { url: configService.get<string>('REDIS_URL') }
            : {
                host: configService.get<string>('REDIS_HOST'),
                port: configService.get<number>('REDIS_PORT'),
                password: configService.get<string>('REDIS_PASSWORD'),
                db: configService.get<number>('REDIS_DB'),
                tls: configService.get('REDIS_TLS'),
              }),
        },
      }),
    }),

    // api modules
    HealthModule,
    PrismaModule,
    UtilsModule,
    EmailModule,
    RedisModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    ProductModule,
    CategoryModule,
    AccessControlModule,
    LocationModule,
    ModulesDefinitionModule,
    PackagesModule,
    SupplierModule,
    StockModule,
    CustomerModule,
    POSModule,
    InvoiceModule,
  ],

  providers: [
    // Global Rate-Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global Onboarding Check Guard
    // Blocks access if user hasn't completed onboarding
    // Use @SkipOnboardingCheck() decorator to bypass for specific routes
    {
      provide: APP_GUARD,
      useClass: OnboardingGuard,
    },

    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // Global Interceptors (chain order)
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // Logs requests/responses
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor, // Sets request timeouts
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeResponseInterceptor, // Removes sensitive fields
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor, // Shapes final responses
    },
  ],
})
export class AppModule {}
