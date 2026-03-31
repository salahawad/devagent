import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SyncProcessor } from './sync.processor';
import { GitCollector } from './collectors/git.collector';
import { PmCollector } from './collectors/pm.collector';
import { MetricsAnalyzer } from './analyzers/metrics.analyzer';
import { HealthAnalyzer } from './analyzers/health.analyzer';
import { TenantConnectionService } from '../database/tenant-connection.service';
import { Tenant } from '../database/entities/system/tenant.entity';
import { Integration } from '../database/entities/system/integration.entity';
import { SyncJob } from '../database/entities/system/sync-job.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'devagent',
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB || 'system_db',
      entities: [Tenant, Integration, SyncJob],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Tenant, Integration, SyncJob]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({ name: 'sync' }),
  ],
  providers: [
    SyncProcessor,
    GitCollector,
    PmCollector,
    MetricsAnalyzer,
    HealthAnalyzer,
    TenantConnectionService,
  ],
})
export class WorkerModule {}
