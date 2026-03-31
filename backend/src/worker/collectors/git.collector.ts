import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IntegrationFactory } from '../../integrations/integration.factory';
import { Developer } from '../../database/entities/tenant/developer.entity';
import { Repository as RepoEntity } from '../../database/entities/tenant/repository.entity';
import { Commit } from '../../database/entities/tenant/commit.entity';
import { MergeRequest } from '../../database/entities/tenant/merge-request.entity';
import { Pipeline } from '../../database/entities/tenant/pipeline.entity';

@Injectable()
export class GitCollector {
  private readonly logger = new Logger('GitCollector');

  async collect(tenantDs: DataSource, provider: string, config: any, since?: string): Promise<{ inserted: number; updated: number; total: number }> {
    const adapter = IntegrationFactory.getGitAdapter(provider);
    let inserted = 0;
    let updated = 0;

    const devRepo = tenantDs.getRepository(Developer);
    const repoRepo = tenantDs.getRepository(RepoEntity);
    const commitRepo = tenantDs.getRepository(Commit);
    const mrRepo = tenantDs.getRepository(MergeRequest);
    const pipelineRepo = tenantDs.getRepository(Pipeline);

    // Sync repositories
    const repos = await adapter.fetchRepositories(config);
    for (const r of repos) {
      const existing = await repoRepo.findOne({
        where: { external_id: r.external_id, provider },
      });
      if (!existing) {
        await repoRepo.save(repoRepo.create({
          external_id: r.external_id,
          provider,
          name: r.name,
          full_name: r.full_name,
          url: r.url,
          default_branch: r.default_branch,
        }));
      }
    }

    // For each tracked repo, fetch commits, MRs, pipelines
    const trackedRepos = await repoRepo.find({ where: { provider, is_tracked: true } });
    const allDevs = await devRepo.find();
    // Build lookup that resolves linked profiles to their primary
    const devMap = new Map<string, Developer>();
    const devMapByUsername = new Map<string, Developer>();
    const devMapByDisplayName = new Map<string, Developer>();
    for (const d of allDevs) {
      const resolved = d.linked_to ? allDevs.find(p => p.id === d.linked_to) || d : d;
      if (d.email) devMap.set(d.email.toLowerCase(), resolved);
      if (d.username) devMapByUsername.set(d.username.toLowerCase(), resolved);
      if (d.display_name) devMapByDisplayName.set(d.display_name.toLowerCase(), resolved);
    }

    for (const repo of trackedRepos) {
      // Fetch commits
      try {
        const commits = await adapter.fetchCommits(config, repo.external_id, since);
        for (const c of commits) {
          const existing = await commitRepo.findOne({
            where: { external_id: c.sha, repository_id: repo.id },
          });
          if (existing) { updated++; continue; }

          // Match developer by email, username, or display name
          const dev = devMap.get(c.author_email?.toLowerCase())
            || devMapByUsername.get(c.author_email?.split('@')[0]?.toLowerCase())
            || devMapByUsername.get(c.author_name?.toLowerCase())
            || devMapByDisplayName.get(c.author_name?.toLowerCase());

          const isMerge = /^merge/i.test(c.message) || c.message.includes("Merge branch");
          const isRevert = /^revert/i.test(c.message);
          const ticketRefs = this.extractTicketRefs(c.message);

          await commitRepo.save(commitRepo.create({
            external_id: c.sha,
            repository_id: repo.id,
            developer_id: dev?.id,
            message: c.message,
            author_email: c.author_email,
            author_name: c.author_name,
            committed_at: new Date(c.committed_at),
            lines_added: c.lines_added,
            lines_deleted: c.lines_deleted,
            files_changed: c.files_changed,
            is_merge: isMerge,
            is_revert: isRevert,
            ticket_refs: ticketRefs,
          }));
          inserted++;
        }
      } catch (err) {
        this.logger.warn(`[GitCollector] Commits failed for ${repo.name}:`, err.message);
      }

      // Fetch MRs
      try {
        const mrs = await adapter.fetchMergeRequests(config, repo.external_id, since);
        for (const mr of mrs) {
          const existing = await mrRepo.findOne({
            where: { external_id: mr.external_id, repository_id: repo.id },
          });

          const author = devMapByUsername.get(mr.author_username?.toLowerCase());
          const turnaround = mr.merged_at && mr.created_at
            ? Math.round((new Date(mr.merged_at).getTime() - new Date(mr.created_at).getTime()) / 60000)
            : null;

          if (existing) {
            existing.state = mr.state;
            existing.merged_at = mr.merged_at ? new Date(mr.merged_at) : null;
            existing.review_comments_count = mr.review_comments_count;
            existing.turnaround_minutes = turnaround;
            await mrRepo.save(existing);
          } else {
            await mrRepo.save(mrRepo.create({
              external_id: mr.external_id,
              repository_id: repo.id,
              author_id: author?.id,
              title: mr.title,
              state: mr.state,
              created_at_ext: new Date(mr.created_at),
              merged_at: mr.merged_at ? new Date(mr.merged_at) : null,
              closed_at: mr.closed_at ? new Date(mr.closed_at) : null,
              review_comments_count: mr.review_comments_count,
              approvals_count: mr.approvals_count,
              additions: mr.additions,
              deletions: mr.deletions,
              turnaround_minutes: turnaround,
            }));
            inserted++;
          }
        }
      } catch (err) {
        this.logger.warn(`[GitCollector] MRs failed for ${repo.name}:`, err.message);
      }

      // Fetch pipelines
      try {
        const pipelines = await adapter.fetchPipelines(config, repo.external_id, since);
        for (const p of pipelines) {
          const existing = await pipelineRepo.findOne({
            where: { external_id: p.external_id, repository_id: repo.id },
          });
          if (existing) {
            existing.status = p.status;
            existing.duration_seconds = p.duration_seconds;
            await pipelineRepo.save(existing);
          } else {
            await pipelineRepo.save(pipelineRepo.create({
              external_id: p.external_id,
              repository_id: repo.id,
              ref: p.ref,
              status: p.status,
              duration_seconds: p.duration_seconds,
              created_at_ext: new Date(p.created_at),
            }));
            inserted++;
          }
        }
      } catch (err) {
        this.logger.warn(`[GitCollector] Pipelines failed for ${repo.name}:`, err.message);
      }
    }

    return { inserted, updated, total: inserted + updated };
  }

  private extractTicketRefs(message: string): string[] {
    const matches = message.match(/[A-Z]{2,10}-\d+/g);
    return matches ? [...new Set(matches)] : [];
  }
}
