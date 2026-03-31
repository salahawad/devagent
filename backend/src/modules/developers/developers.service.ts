import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as TypeOrmRepo, DataSource, IsNull } from 'typeorm';
import { Integration } from '../../database/entities/system/integration.entity';
import { Developer } from '../../database/entities/tenant/developer.entity';
import { Commit } from '../../database/entities/tenant/commit.entity';
import { Issue } from '../../database/entities/tenant/issue.entity';
import { MergeRequest } from '../../database/entities/tenant/merge-request.entity';
import { IntegrationFactory } from '../../integrations/integration.factory';
import { decrypt } from '../../common/encryption';

@Injectable()
export class DevelopersService {
  constructor(
    @InjectRepository(Integration) private integrationRepo: TypeOrmRepo<Integration>,
  ) {}

  async list(tenantDs: DataSource) {
    const repo = tenantDs.getRepository(Developer);
    const all = await repo.find({ order: { display_name: 'ASC' } });

    // Group: primary profiles get a `linked_profiles` array attached
    const primaries = all.filter(d => !d.linked_to);
    const secondaries = all.filter(d => d.linked_to);

    return primaries.map(p => ({
      ...p,
      linked_profiles: secondaries.filter(s => s.linked_to === p.id),
    }));
  }

  async listAll(tenantDs: DataSource) {
    const repo = tenantDs.getRepository(Developer);
    return repo.find({ order: { display_name: 'ASC' } });
  }

  async fetchFromSources(tenantId: string, tenantDs: DataSource) {
    const integrations = await this.integrationRepo.find({ where: { tenant_id: tenantId } });
    const devRepo = tenantDs.getRepository(Developer);
    const fetched: Developer[] = [];

    for (const integration of integrations) {
      const config: any = { ...integration.config, token: decrypt(integration.config.token) };

      if (integration.type === 'git') {
        const adapter = IntegrationFactory.getGitAdapter(integration.provider);
        const devs = await adapter.fetchDevelopers(config);

        for (const d of devs) {
          const existing = await devRepo.findOne({
            where: { external_id: d.external_id, provider: integration.provider },
          });
          if (!existing) {
            const dev = devRepo.create({
              external_id: d.external_id,
              provider: integration.provider,
              username: d.username,
              display_name: d.display_name,
              email: d.email,
              avatar_url: d.avatar_url,
              is_tracked: true,
            });
            fetched.push(await devRepo.save(dev));
          } else {
            existing.display_name = d.display_name || existing.display_name;
            existing.avatar_url = d.avatar_url || existing.avatar_url;
            fetched.push(await devRepo.save(existing));
          }
        }
      } else {
        const adapter = IntegrationFactory.getPmAdapter(integration.provider);
        const devs = await adapter.fetchDevelopers(config);

        for (const d of devs) {
          const existing = await devRepo.findOne({
            where: { external_id: d.external_id, provider: integration.provider },
          });
          if (!existing) {
            const dev = devRepo.create({
              external_id: d.external_id,
              provider: integration.provider,
              username: d.username,
              display_name: d.display_name,
              email: d.email,
              avatar_url: d.avatar_url,
              is_tracked: true,
            });
            fetched.push(await devRepo.save(dev));
          } else {
            existing.display_name = d.display_name || existing.display_name;
            fetched.push(await devRepo.save(existing));
          }
        }
      }
    }

    return fetched;
  }

  async update(tenantDs: DataSource, devId: string, dto: { is_tracked?: boolean; role?: string; display_name?: string }) {
    const repo = tenantDs.getRepository(Developer);
    await repo.update(devId, dto);
    return repo.findOne({ where: { id: devId } });
  }

  /**
   * Link secondary developer IDs to a primary developer.
   * The primary becomes the canonical identity; secondaries point to it.
   */
  async link(tenantDs: DataSource, primaryId: string, secondaryIds: string[]) {
    const repo = tenantDs.getRepository(Developer);
    const primary = await repo.findOne({ where: { id: primaryId } });
    if (!primary) throw new Error('Primary developer not found');

    // If primary itself is linked to someone else, resolve to the root
    const rootId = primary.linked_to || primary.id;

    for (const sid of secondaryIds) {
      if (sid === rootId) continue;
      // Also re-point anything linked to this secondary
      await repo.update({ linked_to: sid }, { linked_to: rootId });
      await repo.update(sid, { linked_to: rootId });
    }

    // Ensure root is not linked to itself
    await repo.update(rootId, { linked_to: null as any });

    return this.list(tenantDs);
  }

  /**
   * Unlink a developer — make it a standalone primary again.
   */
  async unlink(tenantDs: DataSource, devId: string) {
    const repo = tenantDs.getRepository(Developer);
    await repo.update(devId, { linked_to: null as any });
    return this.list(tenantDs);
  }

  /**
   * Re-associate all commits, issues, and MRs to the correct developer.
   * Matches by email, username, and display_name. Resolves linked → primary.
   */
  async reassociate(tenantDs: DataSource) {
    const logger = new Logger('Reassociate');
    const devRepo = tenantDs.getRepository(Developer);
    const commitRepo = tenantDs.getRepository(Commit);
    const issueRepo = tenantDs.getRepository(Issue);
    const mrRepo = tenantDs.getRepository(MergeRequest);

    const allDevs = await devRepo.find();

    // Build lookups that resolve linked → primary
    const byEmail = new Map<string, Developer>();
    const byUsername = new Map<string, Developer>();
    const byDisplayName = new Map<string, Developer>();
    const byExternalId = new Map<string, Developer>();

    for (const d of allDevs) {
      const resolved = d.linked_to ? allDevs.find(p => p.id === d.linked_to) || d : d;
      if (d.email) byEmail.set(d.email.toLowerCase(), resolved);
      if (d.username) byUsername.set(d.username.toLowerCase(), resolved);
      if (d.display_name) byDisplayName.set(d.display_name.toLowerCase(), resolved);
      if (d.external_id) byExternalId.set(d.external_id, resolved);
    }

    // Reassociate commits
    const commits = await commitRepo.find();
    let commitUpdated = 0;
    for (const c of commits) {
      const match = (c.author_email ? byEmail.get(c.author_email.toLowerCase()) : null)
        || (c.author_email ? byUsername.get(c.author_email.split('@')[0]?.toLowerCase()) : null)
        || (c.author_name ? byUsername.get(c.author_name.toLowerCase()) : null)
        || (c.author_name ? byDisplayName.get(c.author_name.toLowerCase()) : null);

      const newId = match?.id || null;
      if (newId !== c.developer_id) {
        await commitRepo.update(c.id, { developer_id: newId });
        commitUpdated++;
      }
    }
    logger.log(`Commits reassociated: ${commitUpdated}/${commits.length}`);

    // Reassociate issues (by assignee external_id or display_name)
    const issues = await issueRepo.find();
    let issueUpdated = 0;
    for (const i of issues) {
      // Issues don't store raw assignee info after insert, but we can check
      // if current assignee_id points to a linked secondary and fix it
      if (i.assignee_id) {
        const assigneeDev = allDevs.find(d => d.id === i.assignee_id);
        if (assigneeDev?.linked_to) {
          await issueRepo.update(i.id, { assignee_id: assigneeDev.linked_to });
          issueUpdated++;
        }
      }
    }
    logger.log(`Issues reassociated: ${issueUpdated}/${issues.length}`);

    // Reassociate MRs
    const mrs = await mrRepo.find();
    let mrUpdated = 0;
    for (const mr of mrs) {
      if (mr.author_id) {
        const authorDev = allDevs.find(d => d.id === mr.author_id);
        if (authorDev?.linked_to) {
          await mrRepo.update(mr.id, { author_id: authorDev.linked_to });
          mrUpdated++;
        }
      }
    }
    logger.log(`MRs reassociated: ${mrUpdated}/${mrs.length}`);

    return {
      commits: { updated: commitUpdated, total: commits.length },
      issues: { updated: issueUpdated, total: issues.length },
      merge_requests: { updated: mrUpdated, total: mrs.length },
    };
  }
}
