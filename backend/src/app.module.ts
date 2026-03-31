import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { TenantConnectionService } from './database/tenant-connection.service';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { DevelopersModule } from './modules/developers/developers.module';
import { SyncModule } from './modules/sync/sync.module';
import { ReportsModule } from './modules/reports/reports.module';

// System DB entities
import { Tenant } from './database/entities/system/tenant.entity';
import { User } from './database/entities/system/user.entity';
import { Integration } from './database/entities/system/integration.entity';
import { SyncJob } from './database/entities/system/sync-job.entity';

@Module({
  imports: [
    // System database connection
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'devagent',
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB || 'system_db',
      entities: [Tenant, User, Integration, SyncJob],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Tenant, User, Integration, SyncJob]),

    // BullMQ
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // JWT
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),

    AuthModule,
    TenantsModule,
    IntegrationsModule,
    DevelopersModule,
    SyncModule,
    ReportsModule,
  ],
  providers: [TenantConnectionService],
  exports: [TenantConnectionService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
