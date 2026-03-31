import { Injectable } from '@nestjs/common';
import { DataSource, In, IsNull } from 'typeorm';
import { MetricSnapshot } from '../../database/entities/tenant/metric-snapshot.entity';
import { HealthIndicator } from '../../database/entities/tenant/health-indicator.entity';
import { Developer } from '../../database/entities/tenant/developer.entity';
import { Commit } from '../../database/entities/tenant/commit.entity';
import { Issue } from '../../database/entities/tenant/issue.entity';
import { Sprint } from '../../database/entities/tenant/sprint.entity';
import { Pipeline } from '../../database/entities/tenant/pipeline.entity';
import { BusFactor } from '../../database/entities/tenant/bus-factor.entity';
import { MergeRequest } from '../../database/entities/tenant/merge-request.entity';
import { Repository as RepoEntity } from '../../database/entities/tenant/repository.entity';

@Injectable()
export class ReportsService {

  /**
   * Returns only primary (non-linked), tracked developers.
   * These are the canonical profiles that appear in reports.
   */
  private async getTrackedPrimaryDevs(ds: DataSource): Promise<Developer[]> {
    const devRepo = ds.getRepository(Developer);
    return devRepo.find({
      where: { is_tracked: true, linked_to: IsNull() },
      order: { display_name: 'ASC' },
    });
  }

  private async getTrackedDevIds(ds: DataSource): Promise<string[]> {
    const devs = await this.getTrackedPrimaryDevs(ds);
    return devs.map(d => d.id);
  }

  async overview(ds: DataSource) {
    const devIds = await this.getTrackedDevIds(ds);
    if (devIds.length === 0) {
      return { total_commits: 0, lines_added: 0, lines_deleted: 0, total_issues: 0, story_points: 0, ci_pass_rate: 0, engineer_count: 0 };
    }

    const commitRepo = ds.getRepository(Commit);
    const issueRepo = ds.getRepository(Issue);
    const pipelineRepo = ds.getRepository(Pipeline);

    const totalCommits = await commitRepo.createQueryBuilder('c')
      .where('c.developer_id IN (:...ids)', { ids: devIds }).getCount();
    const linesResult = await commitRepo.createQueryBuilder('c')
      .select('SUM(c.lines_added)', 'added')
      .addSelect('SUM(c.lines_deleted)', 'deleted')
      .where('c.developer_id IN (:...ids)', { ids: devIds })
      .getRawOne();
    const totalIssues = await issueRepo.createQueryBuilder('i')
      .where('i.assignee_id IN (:...ids)', { ids: devIds }).getCount();
    const spResult = await issueRepo.createQueryBuilder('i')
      .select('SUM(i.story_points)', 'total')
      .where('i.assignee_id IN (:...ids)', { ids: devIds })
      .getRawOne();
    const totalPipelines = await pipelineRepo.count();
    const successPipelines = await pipelineRepo.count({ where: { status: 'success' } });
    const ciPassRate = totalPipelines > 0 ? Math.round((successPipelines / totalPipelines) * 100) : 0;

    return {
      total_commits: totalCommits,
      lines_added: Number(linesResult?.added || 0),
      lines_deleted: Number(linesResult?.deleted || 0),
      total_issues: totalIssues,
      story_points: Number(spResult?.total || 0),
      ci_pass_rate: ciPassRate,
      engineer_count: devIds.length,
    };
  }

  async health(ds: DataSource) {
    const repo = ds.getRepository(HealthIndicator);
    return repo.find({ order: { computed_at: 'DESC' } });
  }

  async developers(ds: DataSource) {
    const devIds = await this.getTrackedDevIds(ds);
    if (devIds.length === 0) return [];
    const snapshotRepo = ds.getRepository(MetricSnapshot);
    return snapshotRepo.find({
      where: { developer_id: In(devIds) },
      relations: ['developer'],
    });
  }

  async quality(ds: DataSource) {
    const devIds = await this.getTrackedDevIds(ds);
    if (devIds.length === 0) return [];
    const snapshotRepo = ds.getRepository(MetricSnapshot);
    const snapshots = await snapshotRepo.find({
      where: { developer_id: In(devIds) },
      relations: ['developer'],
    });

    return snapshots.map(s => ({
      developer: s.developer?.display_name || 'Unknown',
      commits_per_week: s.active_days > 0
        ? Math.round((s.total_commits / (s.active_days / 5)) * 10) / 10
        : 0,
      bug_fix_ratio: s.total_commits > 0
        ? Math.round((s.fix_commits / s.total_commits) * 100)
        : 0,
      code_churn: Number(s.code_churn_pct) || 0,
      reverts: s.revert_commits,
      merge_noise: s.total_commits > 0
        ? Math.round((s.merge_commits / s.total_commits) * 100)
        : 0,
      completion_rate: Number(s.completion_rate) || 0,
      carry_over: Number(s.carry_over_rate) || 0,
      mr_turnaround: s.avg_mr_turnaround_minutes,
      ci_pass_rate: Number(s.ci_pass_rate) || null,
      traceability: Number(s.traceability_pct) || 0,
    }));
  }

  async jira(ds: DataSource) {
    const issueRepo = ds.getRepository(Issue);
    const devs = await this.getTrackedPrimaryDevs(ds);
    const result: any[] = [];

    for (const dev of devs) {
      const issues = await issueRepo.find({ where: { assignee_id: dev.id } });
      const statusCounts: Record<string, number> = {};
      for (const i of issues) {
        statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
      }

      const completed = issues.filter(i => /done|test|closed/i.test(i.status)).length;
      const staleThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const staleTodos = issues.filter(i =>
        i.status_category === 'todo' && i.created_at_ext && new Date(i.created_at_ext) < staleThreshold
      ).length;
      const blocked = issues.filter(i => /blocked|needs.?info/i.test(i.status)).length;
      const totalSp = issues.reduce((s, i) => s + (Number(i.story_points) || 0), 0);

      result.push({
        developer: dev.display_name,
        developer_id: dev.id,
        total_issues: issues.length,
        story_points: totalSp,
        status_distribution: statusCounts,
        completion_rate: issues.length > 0 ? Math.round((completed / issues.length) * 100) : 0,
        stale_todos: staleTodos,
        blocked_count: blocked,
      });
    }

    return result;
  }

  async velocity(ds: DataSource) {
    const sprintRepo = ds.getRepository(Sprint);
    const issueRepo = ds.getRepository(Issue);
    const devs = await this.getTrackedPrimaryDevs(ds);

    const sprints = await sprintRepo.find({ order: { start_date: 'ASC' } });
    const result: any[] = [];

    for (const sprint of sprints) {
      const sprintData: any = { sprint_name: sprint.name, developers: {} };
      let teamSp = 0;

      for (const dev of devs) {
        const issues = await issueRepo.find({
          where: { assignee_id: dev.id, sprint_name: sprint.name },
        });
        const completed = issues.filter(i => /done|test|closed/i.test(i.status));
        const sp = completed.reduce((s, i) => s + (Number(i.story_points) || 0), 0);
        const total = issues.reduce((s, i) => s + (Number(i.story_points) || 0), 0);
        const completionRate = total > 0 ? Math.round((sp / total) * 100) : 0;

        sprintData.developers[dev.display_name] = { sp, total, completion_rate: completionRate };
        teamSp += sp;
      }

      sprintData.team_sp = teamSp;
      result.push(sprintData);
    }

    return result;
  }

  async cycleTime(ds: DataSource) {
    const devIds = await this.getTrackedDevIds(ds);
    if (devIds.length === 0) return [];
    const snapshotRepo = ds.getRepository(MetricSnapshot);
    const snapshots = await snapshotRepo.find({
      where: { developer_id: In(devIds) },
      relations: ['developer'],
    });

    return snapshots.map(s => ({
      developer: s.developer?.display_name,
      avg_cycle_time: Number(s.avg_cycle_time_days),
      median_cycle_time: Number(s.median_cycle_time_days),
      avg_lead_time: Number(s.avg_lead_time_days),
      carry_over_rate: Number(s.carry_over_rate),
      completed_issues: s.completed_issues,
    }));
  }

  async blockers(ds: DataSource) {
    const devIds = await this.getTrackedDevIds(ds);
    const issueRepo = ds.getRepository(Issue);

    const blockedQuery = issueRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.assignee', 'dev')
      .where("i.status ILIKE '%blocked%' OR i.status ILIKE '%needs%info%'");
    if (devIds.length > 0) {
      blockedQuery.andWhere('i.assignee_id IN (:...ids)', { ids: devIds });
    }
    const blocked = await blockedQuery.getMany();

    const staleThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const staleQuery = issueRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.assignee', 'dev')
      .where("i.status_category = 'todo'")
      .andWhere('i.created_at_ext < :threshold', { threshold: staleThreshold });
    if (devIds.length > 0) {
      staleQuery.andWhere('i.assignee_id IN (:...ids)', { ids: devIds });
    }
    const stale = await staleQuery.getMany();

    return {
      blocked: blocked.map(i => ({
        developer: i.assignee?.display_name,
        key: i.external_key,
        status: i.status,
        age_days: i.created_at_ext
          ? Math.round((Date.now() - new Date(i.created_at_ext).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        story_points: Number(i.story_points) || 0,
        title: i.title,
      })),
      stale: stale.map(i => ({
        developer: i.assignee?.display_name,
        key: i.external_key,
        age_days: i.created_at_ext
          ? Math.round((Date.now() - new Date(i.created_at_ext).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        story_points: Number(i.story_points) || 0,
        title: i.title,
      })),
    };
  }

  async patterns(ds: DataSource) {
    const devIds = await this.getTrackedDevIds(ds);
    if (devIds.length === 0) return [];
    const snapshotRepo = ds.getRepository(MetricSnapshot);
    const snapshots = await snapshotRepo.find({
      where: { developer_id: In(devIds) },
      relations: ['developer'],
    });

    return snapshots.map(s => ({
      developer: s.developer?.display_name,
      morning_pct: Number(s.morning_pct),
      afternoon_pct: Number(s.afternoon_pct),
      evening_pct: Number(s.evening_pct),
      late_night_pct: Number(s.late_night_pct),
      peak_hours: s.peak_hours,
      busiest_day: s.busiest_day,
      multi_project_day_pct: Number(s.multi_project_day_pct),
    }));
  }

  async traceability(ds: DataSource) {
    const devIds = await this.getTrackedDevIds(ds);
    if (devIds.length === 0) return [];
    const snapshotRepo = ds.getRepository(MetricSnapshot);
    const snapshots = await snapshotRepo.find({
      where: { developer_id: In(devIds) },
      relations: ['developer'],
    });

    return snapshots.map(s => ({
      developer: s.developer?.display_name,
      traceability_pct: Number(s.traceability_pct),
      total_commits: s.total_commits,
    }));
  }

  async cicd(ds: DataSource) {
    const pipelineRepo = ds.getRepository(Pipeline);
    const repoRepo = ds.getRepository(RepoEntity);

    const repos = await repoRepo.find({ where: { is_tracked: true } });
    const result: any[] = [];

    for (const repo of repos) {
      const total = await pipelineRepo.count({ where: { repository_id: repo.id } });
      const success = await pipelineRepo.count({ where: { repository_id: repo.id, status: 'success' } });
      const failed = await pipelineRepo.count({ where: { repository_id: repo.id, status: 'failed' } });

      if (total > 0) {
        result.push({
          repository: repo.name,
          total_runs: total,
          success_count: success,
          failed_count: failed,
          pass_rate: Math.round((success / total) * 100),
        });
      }
    }

    return result;
  }

  async busFactor(ds: DataSource) {
    const devIds = await this.getTrackedDevIds(ds);
    const busFactorRepo = ds.getRepository(BusFactor);
    const repoRepo = ds.getRepository(RepoEntity);

    const repos = await repoRepo.find({ where: { is_tracked: true } });
    const result: any[] = [];

    for (const repo of repos) {
      let entries = await busFactorRepo.find({
        where: { repository_id: repo.id },
        relations: ['developer'],
        order: { commit_pct: 'DESC' },
      });

      // Filter to only tracked primary devs
      if (devIds.length > 0) {
        entries = entries.filter(e => devIds.includes(e.developer_id));
      }

      if (entries.length === 0) continue;

      result.push({
        repository: repo.name,
        bus_factor_score: entries[0]?.bus_factor_score || 1,
        contributors: entries.map(e => ({
          developer: e.developer?.display_name,
          commit_pct: Number(e.commit_pct),
        })),
      });
    }

    return result;
  }

  async mrHealth(ds: DataSource) {
    const devIds = await this.getTrackedDevIds(ds);
    const mrRepo = ds.getRepository(MergeRequest);

    let query = mrRepo.createQueryBuilder('mr');
    if (devIds.length > 0) {
      query = query.where('mr.author_id IN (:...ids)', { ids: devIds });
    }

    const totalMrs = await query.getCount();

    let mergedQuery = mrRepo.createQueryBuilder('mr').where("mr.state = 'merged'");
    let openQuery = mrRepo.createQueryBuilder('mr').where("mr.state = 'opened'");
    if (devIds.length > 0) {
      mergedQuery = mergedQuery.andWhere('mr.author_id IN (:...ids)', { ids: devIds });
      openQuery = openQuery.andWhere('mr.author_id IN (:...ids)', { ids: devIds });
    }
    const mergedMrs = await mergedQuery.getCount();
    const openMrs = await openQuery.getCount();

    let turnaroundQuery = mrRepo.createQueryBuilder('mr')
      .select('AVG(mr.turnaround_minutes)', 'avg')
      .addSelect('MIN(mr.turnaround_minutes)', 'min')
      .addSelect('MAX(mr.turnaround_minutes)', 'max')
      .where('mr.turnaround_minutes IS NOT NULL');
    if (devIds.length > 0) {
      turnaroundQuery = turnaroundQuery.andWhere('mr.author_id IN (:...ids)', { ids: devIds });
    }
    const turnarounds = await turnaroundQuery.getRawOne();

    return {
      total: totalMrs,
      merged: mergedMrs,
      open: openMrs,
      avg_turnaround_minutes: Math.round(Number(turnarounds?.avg || 0)),
      min_turnaround_minutes: Number(turnarounds?.min || 0),
      max_turnaround_minutes: Number(turnarounds?.max || 0),
    };
  }

  async recommendations(ds: DataSource) {
    const devIds = await this.getTrackedDevIds(ds);
    if (devIds.length === 0) return [];
    const snapshotRepo = ds.getRepository(MetricSnapshot);
    const snapshots = await snapshotRepo.find({
      where: { developer_id: In(devIds) },
      relations: ['developer'],
    });
    const recs: Array<{ developer: string; items: string[] }> = [];

    for (const s of snapshots) {
      const items: string[] = [];
      const name = s.developer?.display_name || 'Unknown';

      if (Number(s.code_churn_pct) > 50)
        items.push('High code churn detected. Consider more thorough planning before implementation.');
      if (Number(s.traceability_pct) < 20)
        items.push('Very low commit traceability. Include ticket references in commit messages.');
      if (s.wip_count > 10)
        items.push(`WIP overload (${s.wip_count} items). Focus on completing existing work before starting new items.`);
      if (s.blocked_count > 0)
        items.push(`${s.blocked_count} blocked items need management attention.`);
      if (s.fix_commits > 0 && s.total_commits > 0 && (s.fix_commits / s.total_commits) > 0.2)
        items.push('High bug-fix ratio. Consider improving QA process or code review coverage.');
      if (Number(s.completion_rate) < 60)
        items.push('Low task completion rate. Re-evaluate sprint planning and estimation accuracy.');
      if (s.revert_commits > 2)
        items.push('Multiple reverts indicate instability. Consider feature flags and staged rollouts.');
      if (Number(s.ci_pass_rate) < 80 && s.ci_pass_rate !== null)
        items.push('CI pass rate below 80%. Investigate failing pipelines.');

      if (items.length === 0) items.push('Performing well across all metrics.');
      recs.push({ developer: name, items });
    }

    return recs;
  }
}
