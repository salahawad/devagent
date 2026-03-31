import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Tenant } from '../database/entities/system/tenant.entity';
import { Integration } from '../database/entities/system/integration.entity';
import { SyncJob } from '../database/entities/system/sync-job.entity';
import { TenantConnectionService } from '../database/tenant-connection.service';
import { GitCollector } from './collectors/git.collector';
import { PmCollector } from './collectors/pm.collector';
import { MetricsAnalyzer } from './analyzers/metrics.analyzer';
import { HealthAnalyzer } from './analyzers/health.analyzer';
import { decrypt } from '../common/encryption';

@Processor('sync')
@Injectable()
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger('SyncProcessor');

  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Integration) private integrationRepo: Repository<Integration>,
    @InjectRepository(SyncJob) private syncJobRepo: Repository<SyncJob>,
    private tenantConnection: TenantConnectionService,
    private gitCollector: GitCollector,
    private pmCollector: PmCollector,
    private metricsAnalyzer: MetricsAnalyzer,
    private healthAnalyzer: HealthAnalyzer,
  ) {
    super();
  }

  private async updateProgress(syncJob: SyncJob, step: number, total: number, message: string, records?: number) {
    syncJob.current_step = step;
    syncJob.total_steps = total;
    syncJob.progress = Math.round((step / total) * 100);
    syncJob.progress_message = message;
    if (records !== undefined) syncJob.records_synced = records;
    await this.syncJobRepo.save(syncJob);
  }

  async process(job: Job) {
    const { tenant_id, job_id } = job.data;
    this.logger.log(`Starting sync for tenant ${tenant_id}`);

    let syncJob: SyncJob;
    if (job_id) {
      syncJob = await this.syncJobRepo.findOne({ where: { id: job_id } });
    }
    if (!syncJob) {
      syncJob = this.syncJobRepo.create({ tenant_id, status: 'pending' });
      await this.syncJobRepo.save(syncJob);
    }

    syncJob.status = 'running';
    syncJob.started_at = new Date();
    syncJob.progress = 0;
    syncJob.progress_message = 'Starting sync...';
    await this.syncJobRepo.save(syncJob);

    const errors: string[] = [];

    try {
      const tenant = await this.tenantRepo.findOne({ where: { id: tenant_id } });
      if (!tenant) throw new Error('Tenant not found');

      const tenantDs = await this.tenantConnection.getConnection(tenant.db_name);
      const integrations = await this.integrationRepo.find({ where: { tenant_id } });
      let totalRecords = 0;

      const totalSteps = integrations.length + 2;
      let currentStep = 0;

      for (const integration of integrations) {
        const providerLabel = `${integration.provider} (${integration.type})`;
        currentStep++;

        try {
          await this.updateProgress(syncJob, currentStep, totalSteps,
            `Syncing ${providerLabel}...`, totalRecords);

          const config = {
            ...integration.config,
            token: decrypt(integration.config.token),
          };

          const since = integration.last_sync_at?.toISOString();

          if (integration.type === 'git') {
            this.logger.log(`Fetching git data from ${integration.provider} (since: ${since || 'all'})`);
            await this.updateProgress(syncJob, currentStep, totalSteps,
              `Fetching repos & commits from ${integration.provider}...`, totalRecords);
            const result = await this.gitCollector.collect(tenantDs, integration.provider, config, since);
            totalRecords += result.total;
            this.logger.log(`${integration.provider} git: ${result.inserted} new, ${result.updated} updated`);
          } else {
            this.logger.log(`Fetching PM data from ${integration.provider} (since: ${since || 'all'})`);
            await this.updateProgress(syncJob, currentStep, totalSteps,
              `Fetching issues & sprints from ${integration.provider}...`, totalRecords);
            const result = await this.pmCollector.collect(tenantDs, integration.provider, config, since);
            totalRecords += result.total;
            this.logger.log(`${integration.provider} pm: ${result.inserted} new, ${result.updated} updated`);
          }

          integration.last_sync_at = new Date();
          await this.integrationRepo.save(integration);

          await this.updateProgress(syncJob, currentStep, totalSteps,
            `${providerLabel} done — ${totalRecords} records so far`, totalRecords);

        } catch (err) {
          const msg = `${providerLabel}: ${err.message}`;
          this.logger.error(`Integration sync failed — ${msg}`, err.stack);
          errors.push(msg);
          await this.updateProgress(syncJob, currentStep, totalSteps,
            `${providerLabel} failed — continuing...`, totalRecords);
        }
      }

      // Compute metrics
      currentStep++;
      try {
        this.logger.log('Computing developer metrics...');
        await this.updateProgress(syncJob, currentStep, totalSteps,
          'Computing developer metrics...', totalRecords);
        await this.metricsAnalyzer.compute(tenantDs);
        this.logger.log('Metrics computation complete');
      } catch (err) {
        this.logger.error('Metrics computation failed', err.stack);
        errors.push(`Metrics: ${err.message}`);
      }

      // Compute health
      currentStep++;
      try {
        this.logger.log('Computing team health indicators...');
        await this.updateProgress(syncJob, currentStep, totalSteps,
          'Computing team health indicators...', totalRecords);
        await this.healthAnalyzer.compute(tenantDs);
        this.logger.log('Health computation complete');
      } catch (err) {
        this.logger.error('Health computation failed', err.stack);
        errors.push(`Health: ${err.message}`);
      }

      // Final status
      syncJob.completed_at = new Date();
      syncJob.records_synced = totalRecords;
      syncJob.progress = 100;

      if (errors.length > 0) {
        syncJob.status = 'completed_with_errors';
        syncJob.error = errors.join(' | ');
        syncJob.progress_message = `Done with ${errors.length} error(s) — ${totalRecords} records`;
        this.logger.warn(`Sync completed with ${errors.length} errors for tenant ${tenant_id}`);
      } else {
        syncJob.status = 'completed';
        syncJob.progress_message = `Completed — ${totalRecords} records synced`;
        this.logger.log(`Sync completed for tenant ${tenant_id}: ${totalRecords} records`);
      }

      await this.syncJobRepo.save(syncJob);

    } catch (err) {
      this.logger.error(`Sync fatally failed for tenant ${tenant_id}`, err.stack);
      syncJob.status = 'failed';
      syncJob.completed_at = new Date();
      syncJob.error = err.message;
      syncJob.progress_message = `Fatal: ${err.message}`;
      await this.syncJobRepo.save(syncJob);
    }
  }
}
