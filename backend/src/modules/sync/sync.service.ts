import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Tenant } from '../../database/entities/system/tenant.entity';
import { SyncJob } from '../../database/entities/system/sync-job.entity';
import { Integration } from '../../database/entities/system/integration.entity';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(SyncJob) private syncJobRepo: Repository<SyncJob>,
    @InjectRepository(Integration) private integrationRepo: Repository<Integration>,
    @InjectQueue('sync') private syncQueue: Queue,
  ) {}

  async getSettings(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) return { sync_frequency_minutes: 360, last_sync: null, integrations_count: 0 };
    const integrations = await this.integrationRepo.find({ where: { tenant_id: tenantId } });
    const lastJob = await this.syncJobRepo.findOne({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });

    return {
      sync_frequency_minutes: tenant.sync_frequency_minutes,
      last_sync: lastJob,
      integrations_count: integrations.length,
    };
  }

  async updateFrequency(tenantId: string, frequencyMinutes: number) {
    await this.tenantRepo.update(tenantId, { sync_frequency_minutes: frequencyMinutes });

    // Remove existing repeatable job for this tenant
    const repeatableJobs = await this.syncQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === `sync-${tenantId}`) {
        await this.syncQueue.removeRepeatableByKey(job.key);
      }
    }

    // Add new repeatable job
    await this.syncQueue.add(
      `sync-${tenantId}`,
      { tenant_id: tenantId },
      {
        repeat: { every: frequencyMinutes * 60 * 1000 },
        jobId: `sync-${tenantId}`,
      },
    );

    return { sync_frequency_minutes: frequencyMinutes };
  }

  async triggerSync(tenantId: string) {
    const job = this.syncJobRepo.create({
      tenant_id: tenantId,
      status: 'pending',
    });
    await this.syncJobRepo.save(job);

    await this.syncQueue.add('sync-now', {
      tenant_id: tenantId,
      job_id: job.id,
    });

    return job;
  }

  async getJobs(tenantId: string) {
    return this.syncJobRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
      take: 20,
    });
  }
}
