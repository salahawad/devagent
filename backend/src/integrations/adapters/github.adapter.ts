import axios, { AxiosInstance } from 'axios';
import {
  GitAdapter, GitAdapterConfig, GitDeveloper, GitRepository,
  GitCommit, GitMergeRequest, GitPipeline,
} from './git.adapter';
import { getRateLimiter } from '../rate-limiter';

export class GitHubAdapter implements GitAdapter {
  private delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  private createClient(config: GitAdapterConfig): AxiosInstance {
    const client = axios.create({
      baseURL: config.base_url || 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
      },
      timeout: 30000,
    });

    // Rate limiter: acquire token before each request
    const limiter = getRateLimiter('github');
    client.interceptors.request.use(async (cfg) => { await limiter.acquire(); return cfg; });

    // Auto-handle GitHub rate limit errors: pause and retry on 403/429
    client.interceptors.response.use(undefined, async (error) => {
      const status = error.response?.status;
      if ((status === 403 || status === 429) && error.response?.headers?.['retry-after']) {
        const wait = parseInt(error.response.headers['retry-after']) * 1000;
        await this.delay(Math.min(wait, 60000));
        return client.request(error.config);
      }
      if (status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
        const resetAt = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
        const wait = Math.max(resetAt - Date.now(), 1000);
        await this.delay(Math.min(wait, 60000));
        return client.request(error.config);
      }
      throw error;
    });

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

    if (config.group_id) {
      let page = 1;
      while (true) {
        const { data } = await client.get(`/orgs/${config.group_id}/members`, {
          params: { per_page: 100, page },
        });
        if (data.length === 0) break;
        for (const u of data) {
          developers.push({
            external_id: String(u.id),
            username: u.login,
            display_name: u.login,
            avatar_url: u.avatar_url,
          });
        }
        if (data.length < 100) break;
        page++;
      }
    }

    return developers;
  }

  async fetchRepositories(config: GitAdapterConfig): Promise<GitRepository[]> {
    const client = this.createClient(config);
    const repos: GitRepository[] = [];
    let page = 1;

    const endpoint = config.group_id
      ? `/orgs/${config.group_id}/repos`
      : '/user/repos';

    while (true) {
      const { data } = await client.get(endpoint, {
        params: { per_page: 100, page, sort: 'updated' },
      });
      if (data.length === 0) break;

      for (const r of data) {
        repos.push({
          external_id: String(r.id),
          name: r.name,
          full_name: r.full_name,
          url: r.html_url,
          default_branch: r.default_branch || 'main',
        });
      }
      if (data.length < 100) break;
      page++;
    }

    return repos;
  }

  async fetchCommits(config: GitAdapterConfig, repoFullName: string, since?: string): Promise<GitCommit[]> {
    const client = this.createClient(config);
    const commits: GitCommit[] = [];
    let page = 1;

    // GitHub list-commits doesn't return stats — only individual commit GET does.
    // Step 1: list SHAs (fast, no stats)
    const shas: Array<{ sha: string; message: string; email: string; name: string; date: string }> = [];

    while (true) {
      const params: any = { per_page: 100, page };
      if (since) params.since = since;

      const { data } = await client.get(`/repos/${repoFullName}/commits`, { params });
      if (data.length === 0) break;

      for (const c of data) {
        shas.push({
          sha: c.sha,
          message: c.commit.message,
          email: c.commit.author?.email || '',
          name: c.commit.author?.name || '',
          date: c.commit.author?.date || '',
        });
      }
      if (data.length < 100) break;
      page++;
      await this.delay(100); // Respect secondary rate limits
    }

    // Step 2: For each commit, we skip individual stats fetch to stay within rate limits.
    // Stats are 0 but we avoid N+1 API calls (5000/hr limit).
    // For accurate line counts, use the MR additions/deletions instead.
    for (const c of shas) {
      commits.push({
        sha: c.sha,
        message: c.message,
        author_email: c.email,
        author_name: c.name,
        committed_at: c.date,
        lines_added: 0,
        lines_deleted: 0,
        files_changed: 0,
      });
    }

    return commits;
  }

  async fetchMergeRequests(config: GitAdapterConfig, repoFullName: string, since?: string): Promise<GitMergeRequest[]> {
    const client = this.createClient(config);
    const prs: GitMergeRequest[] = [];
    let page = 1;

    while (true) {
      const params: any = { per_page: 100, page, state: 'all', sort: 'updated', direction: 'desc' };
      if (since) params.since = since;

      const { data } = await client.get(`/repos/${repoFullName}/pulls`, { params });
      if (data.length === 0) break;

      for (const pr of data) {
        prs.push({
          external_id: String(pr.number),
          title: pr.title,
          state: pr.merged_at ? 'merged' : pr.state,
          author_username: pr.user?.login || '',
          created_at: pr.created_at,
          merged_at: pr.merged_at,
          closed_at: pr.closed_at,
          review_comments_count: pr.review_comments || 0,
          approvals_count: 0,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
        });
      }
      if (data.length < 100) break;
      page++;
      await this.delay(100);
    }

    return prs;
  }

  async fetchPipelines(config: GitAdapterConfig, repoFullName: string, since?: string): Promise<GitPipeline[]> {
    const client = this.createClient(config);
    const runs: GitPipeline[] = [];
    let page = 1;

    try {
      while (true) {
        const { data } = await client.get(`/repos/${repoFullName}/actions/runs`, {
          params: { per_page: 100, page },
        });
        if (!data.workflow_runs || data.workflow_runs.length === 0) break;

        for (const run of data.workflow_runs) {
          runs.push({
            external_id: String(run.id),
            ref: run.head_branch,
            status: run.conclusion || run.status,
            duration_seconds: run.run_started_at && run.updated_at
              ? Math.round((new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()) / 1000)
              : 0,
            created_at: run.created_at,
          });
        }
        if (data.workflow_runs.length < 100) break;
        page++;
        await this.delay(100);
      }
    } catch {
      // Actions may not be enabled
    }

    return runs;
  }
}
