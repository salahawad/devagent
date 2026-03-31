import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { Tenant } from '../../database/entities/system/tenant.entity';
import { SyncJob } from '../../database/entities/system/sync-job.entity';
import { Integration } from '../../database/entities/system/integration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, SyncJob, Integration]),
    BullModule.registerQueue({ name: 'sync' }),
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
