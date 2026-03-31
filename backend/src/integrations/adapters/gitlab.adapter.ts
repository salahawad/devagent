import axios, { AxiosInstance } from 'axios';
import {
  GitAdapter, GitAdapterConfig, GitDeveloper, GitRepository,
  GitCommit, GitMergeRequest, GitPipeline,
} from './git.adapter';
import { getRateLimiter } from '../rate-limiter';

export class GitLabAdapter implements GitAdapter {
  private createClient(config: GitAdapterConfig): AxiosInstance {
    const client = axios.create({
      baseURL: `${config.base_url}/api/v4`,
      headers: { 'PRIVATE-TOKEN': config.token },
      timeout: 60000,
    });
    const limiter = getRateLimiter('gitlab');
    client.interceptors.request.use(async (cfg) => { await limiter.acquire(); return cfg; });
    return client;
  }

  async testConnection(config: GitAdapterConfig): Promise<boolean> {
    try {
      const client = this.createClient(config);
      await client.get('/user');
      return true;
    } catch {
      return false;
    }
  }

  async fetchDevelopers(config: GitAdapterConfig): Promise<GitDeveloper[]> {
    const client = this.createClient(config);
    const developers: GitDeveloper[] = [];
    let page = 1;

    while (true) {
      const { data } = await client.get('/users', {
        params: { active: true, per_page: 100, page },
      });
      if (data.length === 0) break;

      for (const u of data) {
        developers.push({
          external_id: String(u.id),
          username: u.username,
          display_name: u.name,
          email: u.email || u.public_email,
          avatar_url: u.avatar_url,
        });
      }

      if (data.length < 100) break;
      page++;
    }

    return developers;
  }

  async fetchRepositories(config: GitAdapterConfig): Promise<GitRepository[]> {
    const client = this.createClient(config);
    const repos: GitRepository[] = [];
    let page = 1;

    while (true) {
      const params: any = { per_page: 100, page, order_by: 'last_activity_at' };
      const endpoint = config.group_id
        ? `/groups/${config.group_id}/projects`
        : '/projects';

      const { data } = await client.get(endpoint, { params });
      if (data.length === 0) break;

      for (const p of data) {
        repos.push({
          external_id: String(p.id),
          name: p.name,
          full_name: p.path_with_namespace,
          url: p.web_url,
          default_branch: p.default_branch || 'main',
        });
      }

      if (data.length < 100) break;
      page++;
    }

    return repos;
  }

  async fetchCommits(config: GitAdapterConfig, repoId: string, since?: string): Promise<GitCommit[]> {
    const client = this.createClient(config);
    const commits: GitCommit[] = [];
    let page = 1;

    // For self-hosted GitLab CE: with_stats on list endpoint is fine
    // (slow only on gitlab.com at scale)
    while (true) {
      const params: any = { per_page: 100, page, with_stats: true };
      if (since) params.since = since;

      const { data } = await client.get(`/projects/${repoId}/repository/commits`, { params });
      if (data.length === 0) break;

      for (const c of data) {
        commits.push({
          sha: c.id,
          message: c.message || c.title,
          author_email: c.author_email,
          author_name: c.author_name,
          committed_at: c.committed_date,
          lines_added: c.stats?.additions || 0,
          lines_deleted: c.stats?.deletions || 0,
          files_changed: c.stats?.total || 0,
        });
      }

      if (data.length < 100) break;
      page++;
    }

    return commits;
  }

  async fetchMergeRequests(config: GitAdapterConfig, repoId: string, since?: string): Promise<GitMergeRequest[]> {
    const client = this.createClient(config);
    const mrs: GitMergeRequest[] = [];
    let page = 1;

    while (true) {
      const params: any = { per_page: 100, page, state: 'all' };
      if (since) params.updated_after = since;

      const { data } = await client.get(`/projects/${repoId}/merge_requests`, { params });
      if (data.length === 0) break;

      for (const mr of data) {
        mrs.push({
          external_id: String(mr.iid),
          title: mr.title,
          state: mr.state,
          author_username: mr.author?.username || '',
          created_at: mr.created_at,
          merged_at: mr.merged_at,
          closed_at: mr.closed_at,
          review_comments_count: mr.user_notes_count || 0,
          approvals_count: 0,
          additions: 0,
          deletions: 0,
        });
      }

      if (data.length < 100) break;
      page++;
    }

    return mrs;
  }

  async fetchPipelines(config: GitAdapterConfig, repoId: string, since?: string): Promise<GitPipeline[]> {
    const client = this.createClient(config);
    const pipelines: GitPipeline[] = [];
    let page = 1;

    while (true) {
      const params: any = { per_page: 100, page };
      if (since) params.updated_after = since;

      const { data } = await client.get(`/projects/${repoId}/pipelines`, { params });
      if (data.length === 0) break;

      for (const p of data) {
        pipelines.push({
          external_id: String(p.id),
          ref: p.ref,
          status: p.status,
          duration_seconds: p.duration || 0,
          created_at: p.created_at,
        });
      }

      if (data.length < 100) break;
      page++;
    }

    return pipelines;
  }
}
