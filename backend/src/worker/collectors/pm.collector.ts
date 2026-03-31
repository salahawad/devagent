import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IntegrationFactory } from '../../integrations/integration.factory';
import { Developer } from '../../database/entities/tenant/developer.entity';
import { Issue } from '../../database/entities/tenant/issue.entity';
import { IssueTransition } from '../../database/entities/tenant/issue-transition.entity';
import { Sprint } from '../../database/entities/tenant/sprint.entity';

@Injectable()
export class PmCollector {
  private readonly logger = new Logger('PmCollector');

  async collect(tenantDs: DataSource, provider: string, config: any, since?: string): Promise<{ inserted: number; updated: number; total: number }> {
    const adapter = IntegrationFactory.getPmAdapter(provider);
    let inserted = 0;
    let updated = 0;

    const devRepo = tenantDs.getRepository(Developer);
    const issueRepo = tenantDs.getRepository(Issue);
    const transitionRepo = tenantDs.getRepository(IssueTransition);
    const sprintRepo = tenantDs.getRepository(Sprint);

    // Build developer lookup (include linked profiles — resolve to primary)
    const allDevs = await devRepo.find();
    const devByExternalId = new Map<string, Developer>();
    const devByName = new Map<string, Developer>();

    for (const d of allDevs) {
      // If this dev is linked to a primary, resolve to the primary
      const resolved = d.linked_to
        ? allDevs.find(p => p.id === d.linked_to) || d
        : d;
      if (d.external_id) devByExternalId.set(d.external_id, resolved);
      if (d.display_name) devByName.set(d.display_name.toLowerCase(), resolved);
    }

    // Sync sprints
    try {
      const sprints = await adapter.fetchSprints(config);
      for (const s of sprints) {
        try {
          const existing = await sprintRepo.findOne({
            where: { external_id: s.external_id, provider },
          });
          if (!existing) {
            await sprintRepo.save(sprintRepo.create({
              external_id: s.external_id,
              provider,
              name: s.name,
              state: s.state,
              start_date: s.start_date ? new Date(s.start_date) : null,
              end_date: s.end_date ? new Date(s.end_date) : null,
            }));
          } else {
            existing.state = s.state;
            existing.end_date = s.end_date ? new Date(s.end_date) : existing.end_date;
            await sprintRepo.save(existing);
          }
        } catch (err) {
          this.logger.warn(` Sprint ${s.name} failed:`, err.message);
        }
      }
    } catch (err) {
      console.warn(`[PmCollector] fetchSprints failed:`, err.message);
    }

    // Sync issues
    let issues: any[] = [];
    try {
      issues = await adapter.fetchIssues(config, since);
    } catch (err) {
      console.warn(`[PmCollector] fetchIssues failed:`, err.message);
      return { inserted, updated, total: 0 };
    }

    for (const i of issues) {
      try {
        const assignee = devByExternalId.get(i.assignee_external_id)
          || devByName.get(i.assignee_name?.toLowerCase());

        const existing = await issueRepo.findOne({
          where: { external_id: i.external_id, provider },
        });

        if (existing) {
          existing.status = i.status;
          existing.status_category = i.status_category;
          existing.assignee_id = assignee?.id || existing.assignee_id;
          existing.story_points = i.story_points ?? existing.story_points;
          existing.sprint_name = i.sprint_name || existing.sprint_name;
          existing.sprint_start = i.sprint_start ? new Date(i.sprint_start) : existing.sprint_start;
          existing.sprint_end = i.sprint_end ? new Date(i.sprint_end) : existing.sprint_end;
          existing.updated_at_ext = new Date(i.updated_at);
          existing.resolved_at = i.resolved_at ? new Date(i.resolved_at) : existing.resolved_at;
          await issueRepo.save(existing);
          updated++;
        } else {
          await issueRepo.save(issueRepo.create({
            external_id: i.external_id,
            external_key: i.external_key,
            provider,
            assignee_id: assignee?.id,
            title: i.title,
            type: i.type,
            status: i.status,
            status_category: i.status_category,
            priority: i.priority,
            story_points: i.story_points,
            sprint_name: i.sprint_name,
            sprint_start: i.sprint_start ? new Date(i.sprint_start) : null,
            sprint_end: i.sprint_end ? new Date(i.sprint_end) : null,
            created_at_ext: new Date(i.created_at),
            updated_at_ext: new Date(i.updated_at),
            resolved_at: i.resolved_at ? new Date(i.resolved_at) : null,
          }));
          inserted++;
        }

        // Skip per-issue changelog during bulk sync — too many API calls.
        // Cycle time is computed from issue created_at / resolved_at instead.
      } catch (err) {
        this.logger.warn(` Issue ${i.external_key} failed:`, err.message);
      }
    }

    return { inserted, updated, total: inserted + updated };
  }
}
