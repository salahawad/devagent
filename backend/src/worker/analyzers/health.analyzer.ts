import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MetricSnapshot } from '../../database/entities/tenant/metric-snapshot.entity';
import { BusFactor } from '../../database/entities/tenant/bus-factor.entity';
import { Issue } from '../../database/entities/tenant/issue.entity';
import { MergeRequest } from '../../database/entities/tenant/merge-request.entity';
import { Pipeline } from '../../database/entities/tenant/pipeline.entity';
import { HealthIndicator } from '../../database/entities/tenant/health-indicator.entity';
import { Developer } from '../../database/entities/tenant/developer.entity';
import { Repository as RepoEntity } from '../../database/entities/tenant/repository.entity';

@Injectable()
export class HealthAnalyzer {
  async compute(tenantDs: DataSource): Promise<void> {
    const snapshotRepo = tenantDs.getRepository(MetricSnapshot);
    const busFactorRepo = tenantDs.getRepository(BusFactor);
    const issueRepo = tenantDs.getRepository(Issue);
    const mrRepo = tenantDs.getRepository(MergeRequest);
    const pipelineRepo = tenantDs.getRepository(Pipeline);
    const repoRepo = tenantDs.getRepository(RepoEntity);
    const healthRepo = tenantDs.getRepository(HealthIndicator);

    // Clear old indicators
    await healthRepo.clear();

    // Only use snapshots for tracked primary devs
    const allSnapshots = await snapshotRepo.find({ relations: ['developer'] });
    const devRepo = tenantDs.getRepository(Developer);
    const allDevs = await devRepo.find();
    const trackedPrimaryIds = new Set(allDevs.filter(d => d.is_tracked && !d.linked_to).map(d => d.id));
    const snapshots = allSnapshots.filter(s => trackedPrimaryIds.has(s.developer_id));
    if (snapshots.length === 0) return;

    // 1. Velocity Trend
    const totalSP = snapshots.reduce((s, snap) => s + (Number(snap.story_points_completed) || 0), 0);
    await healthRepo.save(healthRepo.create({
      indicator: 'velocity_trend',
      status: totalSP > 0 ? 'green' : 'red',
      detail: `${totalSP} total story points completed across team`,
    }));

    // 2. Code Review Culture
    const totalReviewComments = snapshots.reduce((s, snap) => s + snap.review_comments_given, 0);
    await healthRepo.save(healthRepo.create({
      indicator: 'code_review_culture',
      status: totalReviewComments > 10 ? 'green' : totalReviewComments > 2 ? 'amber' : 'red',
      detail: `${totalReviewComments} total review comments across team`,
    }));

    // 3. Commit Traceability
    const avgTraceability = snapshots.reduce((s, snap) => s + (Number(snap.traceability_pct) || 0), 0) / snapshots.length;
    await healthRepo.save(healthRepo.create({
      indicator: 'commit_traceability',
      status: avgTraceability > 60 ? 'green' : avgTraceability > 30 ? 'amber' : 'red',
      detail: `${Math.round(avgTraceability)}% avg traceability across devs`,
    }));

    // 4. WIP Discipline
    const avgWip = snapshots.reduce((s, snap) => s + snap.wip_count, 0) / snapshots.length;
    await healthRepo.save(healthRepo.create({
      indicator: 'wip_discipline',
      status: avgWip <= 5 ? 'green' : avgWip <= 10 ? 'amber' : 'red',
      detail: `Avg ${Math.round(avgWip)} items in progress per developer`,
    }));

    // 5. CI/CD Coverage
    const repos = await repoRepo.find({ where: { is_tracked: true } });
    let reposWithCi = 0;
    for (const repo of repos) {
      const pipelineCount = await pipelineRepo.count({ where: { repository_id: repo.id } });
      if (pipelineCount > 0) reposWithCi++;
    }
    const ciCoverage = repos.length > 0 ? (reposWithCi / repos.length) * 100 : 0;
    await healthRepo.save(healthRepo.create({
      indicator: 'cicd_coverage',
      status: ciCoverage > 80 ? 'green' : ciCoverage > 50 ? 'amber' : 'red',
      detail: `${reposWithCi} of ${repos.length} repos have CI pipelines`,
    }));

    // 6. Bus Factor
    const busFactor1Repos = new Set<string>();
    const allBusFactors = await busFactorRepo.find();
    const repoMaxPcts = new Map<string, number>();
    for (const bf of allBusFactors) {
      const current = repoMaxPcts.get(bf.repository_id) || 0;
      if (Number(bf.commit_pct) > current) {
        repoMaxPcts.set(bf.repository_id, Number(bf.commit_pct));
      }
    }
    for (const [repoId, maxPct] of repoMaxPcts) {
      if (maxPct > 80) busFactor1Repos.add(repoId);
    }
    await healthRepo.save(healthRepo.create({
      indicator: 'bus_factor',
      status: busFactor1Repos.size === 0 ? 'green' : busFactor1Repos.size <= 2 ? 'amber' : 'red',
      detail: `${busFactor1Repos.size} of ${repos.length} projects depend on a single developer`,
    }));

    // 7. Cycle Time
    const avgCycleTimes = snapshots.map(s => Number(s.avg_cycle_time_days) || 0).filter(v => v > 0);
    const teamAvgCycle = avgCycleTimes.length > 0
      ? avgCycleTimes.reduce((s, v) => s + v, 0) / avgCycleTimes.length : 0;
    await healthRepo.save(healthRepo.create({
      indicator: 'cycle_time',
      status: teamAvgCycle < 5 ? 'green' : teamAvgCycle < 10 ? 'amber' : 'red',
      detail: `Team avg cycle time: ${teamAvgCycle.toFixed(1)} days`,
    }));

    // 8. Sprint Carry-over
    const avgCarryOver = snapshots.reduce((s, snap) => s + (Number(snap.carry_over_rate) || 0), 0) / snapshots.length;
    await healthRepo.save(healthRepo.create({
      indicator: 'sprint_carry_over',
      status: avgCarryOver < 15 ? 'green' : avgCarryOver < 30 ? 'amber' : 'red',
      detail: `Team avg carry-over: ${Math.round(avgCarryOver)}%`,
    }));

    // 9. Blocked Items
    const totalBlocked = snapshots.reduce((s, snap) => s + snap.blocked_count, 0);
    await healthRepo.save(healthRepo.create({
      indicator: 'blocked_items',
      status: totalBlocked === 0 ? 'green' : totalBlocked <= 3 ? 'amber' : 'red',
      detail: `${totalBlocked} blocked/needs-info items across team`,
    }));

    // 10. Backlog Hygiene
    const staleIssues = await issueRepo
      .createQueryBuilder('i')
      .where("i.status_category = 'todo'")
      .andWhere("i.created_at_ext < :threshold", {
        threshold: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      })
      .getCount();

    await healthRepo.save(healthRepo.create({
      indicator: 'backlog_hygiene',
      status: staleIssues < 5 ? 'green' : staleIssues < 15 ? 'amber' : 'red',
      detail: `${staleIssues} stale To Do items older than 14 days`,
    }));
  }
}
