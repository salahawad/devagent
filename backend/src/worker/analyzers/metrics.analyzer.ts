import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Developer } from '../../database/entities/tenant/developer.entity';
import { Commit } from '../../database/entities/tenant/commit.entity';
import { MergeRequest } from '../../database/entities/tenant/merge-request.entity';
import { Issue } from '../../database/entities/tenant/issue.entity';
import { IssueTransition } from '../../database/entities/tenant/issue-transition.entity';
import { Pipeline } from '../../database/entities/tenant/pipeline.entity';
import { MetricSnapshot } from '../../database/entities/tenant/metric-snapshot.entity';
import { BusFactor } from '../../database/entities/tenant/bus-factor.entity';
import { Repository as RepoEntity } from '../../database/entities/tenant/repository.entity';

@Injectable()
export class MetricsAnalyzer {
  async compute(tenantDs: DataSource): Promise<void> {
    const devRepo = tenantDs.getRepository(Developer);
    const commitRepo = tenantDs.getRepository(Commit);
    const mrRepo = tenantDs.getRepository(MergeRequest);
    const issueRepo = tenantDs.getRepository(Issue);
    const transitionRepo = tenantDs.getRepository(IssueTransition);
    const pipelineRepo = tenantDs.getRepository(Pipeline);
    const snapshotRepo = tenantDs.getRepository(MetricSnapshot);
    const busFactorRepo = tenantDs.getRepository(BusFactor);
    const repoEntityRepo = tenantDs.getRepository(RepoEntity);

    // Only compute metrics for tracked primary (non-linked) developers
    const allDevs = await devRepo.find();
    const developers = allDevs.filter(d => d.is_tracked && !d.linked_to);

    // Determine period (use all data range)
    const earliestCommit = await commitRepo
      .createQueryBuilder('c')
      .select('MIN(c.committed_at)', 'min')
      .getRawOne();
    const latestCommit = await commitRepo
      .createQueryBuilder('c')
      .select('MAX(c.committed_at)', 'max')
      .getRawOne();

    const periodStart = earliestCommit?.min
      ? new Date(earliestCommit.min).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const periodEnd = latestCommit?.max
      ? new Date(latestCommit.max).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    for (const dev of developers) {
      // Git metrics
      const commits = await commitRepo.find({ where: { developer_id: dev.id } });
      const totalCommits = commits.length;
      const featureCommits = commits.filter(c => !c.is_merge && !c.is_revert && !/^fix/i.test(c.message)).length;
      const fixCommits = commits.filter(c => /^fix|bugfix|hotfix/i.test(c.message)).length;
      const mergeCommits = commits.filter(c => c.is_merge).length;
      const revertCommits = commits.filter(c => c.is_revert).length;
      const linesAdded = commits.reduce((s, c) => s + c.lines_added, 0);
      const linesDeleted = commits.reduce((s, c) => s + c.lines_deleted, 0);
      const codeChurn = linesAdded > 0 ? Math.round((linesDeleted / linesAdded) * 100) : 0;

      // Active days
      const activeDays = new Set(commits.map(c =>
        new Date(c.committed_at).toISOString().split('T')[0]
      )).size;

      // Repos contributed
      const reposContributed = [...new Set(commits.map(c => c.repository_id).filter(Boolean))];

      // Work patterns
      const hours = commits.map(c => new Date(c.committed_at).getHours());
      const morning = hours.filter(h => h >= 6 && h < 12).length;
      const afternoon = hours.filter(h => h >= 12 && h < 18).length;
      const evening = hours.filter(h => h >= 18 && h < 22).length;
      const lateNight = hours.filter(h => h >= 22 || h < 6).length;
      const total = hours.length || 1;
      const morningPct = Math.round((morning / total) * 100);
      const afternoonPct = Math.round((afternoon / total) * 100);
      const eveningPct = Math.round((evening / total) * 100);
      const lateNightPct = Math.round((lateNight / total) * 100);

      // Peak hours
      const hourCounts: Record<number, number> = {};
      hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
      const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      const peakHours = peakHour ? `${peakHour[0]}:00` : null;

      // Busiest day
      const days = commits.map(c => new Date(c.committed_at).toLocaleDateString('en-US', { weekday: 'long' }));
      const dayCounts: Record<string, number> = {};
      days.forEach(d => { dayCounts[d] = (dayCounts[d] || 0) + 1; });
      const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

      // Multi-project days
      const commitsByDay = new Map<string, Set<string>>();
      commits.forEach(c => {
        const day = new Date(c.committed_at).toISOString().split('T')[0];
        if (!commitsByDay.has(day)) commitsByDay.set(day, new Set());
        if (c.repository_id) commitsByDay.get(day)!.add(c.repository_id);
      });
      const multiProjectDays = [...commitsByDay.values()].filter(repos => repos.size > 1).length;
      const multiProjectDayPct = activeDays > 0 ? Math.round((multiProjectDays / activeDays) * 100) : 0;

      // Traceability
      const commitsWithTickets = commits.filter(c => c.ticket_refs && c.ticket_refs.length > 0).length;
      const traceabilityPct = totalCommits > 0 ? Math.round((commitsWithTickets / totalCommits) * 100) : 0;

      // MR metrics
      const mrs = await mrRepo.find({ where: { author_id: dev.id } });
      const mrCount = mrs.length;
      const mrTurnarounds = mrs.filter(m => m.turnaround_minutes).map(m => m.turnaround_minutes);
      const avgMrTurnaround = mrTurnarounds.length > 0
        ? Math.round(mrTurnarounds.reduce((s, t) => s + t, 0) / mrTurnarounds.length)
        : null;
      const reviewCommentsGiven = mrs.reduce((s, m) => s + m.review_comments_count, 0);

      // PM metrics
      const issues = await issueRepo.find({ where: { assignee_id: dev.id } });
      const totalIssues = issues.length;
      const completedIssues = issues.filter(i => i.status_category === 'done' || /done|test|closed/i.test(i.status)).length;
      const storyPointsTotal = issues.reduce((s, i) => s + (Number(i.story_points) || 0), 0);
      const storyPointsCompleted = issues
        .filter(i => i.status_category === 'done' || /done|test|closed/i.test(i.status))
        .reduce((s, i) => s + (Number(i.story_points) || 0), 0);
      const completionRate = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

      // Cycle time from transitions
      const cycleTimes: number[] = [];
      const leadTimes: number[] = [];
      for (const issue of issues) {
        const transitions = await transitionRepo.find({
          where: { issue_id: issue.id },
          order: { transitioned_at: 'ASC' },
        });

        // Cycle time: first "In Progress" → first "Done/Test"
        const startTrans = transitions.find(t => /in.?progress/i.test(t.to_status));
        const endTrans = [...transitions].reverse().find(t => /done|test|closed/i.test(t.to_status));
        if (startTrans && endTrans) {
          const days = (new Date(endTrans.transitioned_at).getTime() - new Date(startTrans.transitioned_at).getTime())
            / (1000 * 60 * 60 * 24);
          if (days >= 0) cycleTimes.push(days);
        }

        // Lead time: created → resolved
        if (issue.created_at_ext && issue.resolved_at) {
          const days = (new Date(issue.resolved_at).getTime() - new Date(issue.created_at_ext).getTime())
            / (1000 * 60 * 60 * 24);
          if (days >= 0) leadTimes.push(days);
        }
      }

      const avgCycleTime = cycleTimes.length > 0
        ? Math.round(cycleTimes.reduce((s, v) => s + v, 0) / cycleTimes.length * 10) / 10
        : null;
      const medianCycleTime = cycleTimes.length > 0
        ? this.median(cycleTimes)
        : null;
      const avgLeadTime = leadTimes.length > 0
        ? Math.round(leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length * 10) / 10
        : null;

      // WIP count
      const wipCount = issues.filter(i => i.status_category === 'in_progress' || /in.?progress/i.test(i.status)).length;
      const blockedCount = issues.filter(i => /blocked|needs.?info/i.test(i.status)).length;

      // Carry-over rate (issues in current sprint that weren't completed)
      const carryOverRate = 0; // TODO: compute from sprint data

      // CI pass rate
      const devRepoIds = reposContributed;
      let ciTotal = 0, ciSuccess = 0;
      for (const repoId of devRepoIds) {
        const pipelines = await pipelineRepo.find({ where: { repository_id: repoId } });
        ciTotal += pipelines.length;
        ciSuccess += pipelines.filter(p => p.status === 'success').length;
      }
      const ciPassRate = ciTotal > 0 ? Math.round((ciSuccess / ciTotal) * 100) : null;

      // Upsert snapshot
      const existing = await snapshotRepo.findOne({
        where: { developer_id: dev.id, period_start: periodStart, period_end: periodEnd },
      });

      const snapshotData: any = {
        developer_id: dev.id,
        period_start: periodStart,
        period_end: periodEnd,
        total_commits: totalCommits,
        feature_commits: featureCommits,
        fix_commits: fixCommits,
        merge_commits: mergeCommits,
        revert_commits: revertCommits,
        lines_added: linesAdded,
        lines_deleted: linesDeleted,
        code_churn_pct: codeChurn,
        active_days: activeDays,
        repos_contributed: reposContributed,
        total_issues: totalIssues,
        completed_issues: completedIssues,
        story_points_total: storyPointsTotal,
        story_points_completed: storyPointsCompleted,
        completion_rate: completionRate,
        avg_cycle_time_days: avgCycleTime,
        median_cycle_time_days: medianCycleTime,
        avg_lead_time_days: avgLeadTime,
        carry_over_rate: carryOverRate,
        wip_count: wipCount,
        blocked_count: blockedCount,
        morning_pct: morningPct,
        afternoon_pct: afternoonPct,
        evening_pct: eveningPct,
        late_night_pct: lateNightPct,
        peak_hours: peakHours,
        busiest_day: busiestDay,
        multi_project_day_pct: multiProjectDayPct,
        mr_count: mrCount,
        avg_mr_turnaround_minutes: avgMrTurnaround,
        review_comments_given: reviewCommentsGiven,
        traceability_pct: traceabilityPct,
        ci_pass_rate: ciPassRate,
        computed_at: new Date(),
      };

      if (existing) {
        await snapshotRepo.update(existing.id, snapshotData);
      } else {
        await snapshotRepo.save(snapshotRepo.create(snapshotData));
      }
    }

    // Compute bus factor
    await this.computeBusFactor(tenantDs);
  }

  private async computeBusFactor(tenantDs: DataSource) {
    const commitRepo = tenantDs.getRepository(Commit);
    const busFactorRepo = tenantDs.getRepository(BusFactor);
    const repoRepo = tenantDs.getRepository(RepoEntity);

    // Clear old bus factor data
    await busFactorRepo.clear();

    const repos = await repoRepo.find({ where: { is_tracked: true } });

    for (const repo of repos) {
      const commits = await commitRepo.find({ where: { repository_id: repo.id } });
      if (commits.length === 0) continue;

      // Count commits per developer
      const devCounts = new Map<string, number>();
      for (const c of commits) {
        if (!c.developer_id) continue;
        devCounts.set(c.developer_id, (devCounts.get(c.developer_id) || 0) + 1);
      }

      // How many devs have meaningful contributions (>5%)
      const totalCommits = commits.length;
      const significantContributors = [...devCounts.entries()]
        .filter(([, count]) => (count / totalCommits) > 0.05)
        .length;

      const busFactorScore = Math.min(significantContributors, 3);

      for (const [devId, count] of devCounts) {
        await busFactorRepo.save(busFactorRepo.create({
          repository_id: repo.id,
          developer_id: devId,
          commit_pct: Math.round((count / totalCommits) * 100),
          bus_factor_score: busFactorScore,
        }));
      }
    }
  }

  private median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? Math.round(sorted[mid] * 10) / 10
      : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  }
}
