import axios, { AxiosInstance } from 'axios';
import { PmAdapter, PmAdapterConfig, PmDeveloper, PmIssue, PmSprint, PmTransition } from './pm.adapter';
import { getRateLimiter } from '../rate-limiter';

export class ClickUpAdapter implements PmAdapter {
  private createClient(config: PmAdapterConfig): AxiosInstance {
    const client = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: { Authorization: config.token },
      timeout: 30000,
    });

    const limiter = getRateLimiter('clickup');
    client.interceptors.request.use(async (cfg) => { await limiter.acquire(); return cfg; });

    // Auto-retry on 429
    client.interceptors.response.use(undefined, async (error) => {
      if (error.response?.status === 429) {
        await new Promise(r => setTimeout(r, 10000));
        return client.request(error.config);
      }
      throw error;
    });

    return client;
  }

  async testConnection(config: PmAdapterConfig): Promise<boolean> {
    try {
      const client = this.createClient(config);
      await client.get('/user');
      return true;
    } catch {
      return false;
    }
  }

  async fetchDevelopers(config: PmAdapterConfig): Promise<PmDeveloper[]> {
    const client = this.createClient(config);
    const devs: PmDeveloper[] = [];

    if (config.workspace_id) {
      const { data } = await client.get(`/team/${config.workspace_id}/member`);
      for (const member of data.members || []) {
        const u = member.user;
        devs.push({
          external_id: String(u.id),
          username: u.username || u.email,
          display_name: u.username || u.email,
          email: u.email,
          avatar_url: u.profilePicture,
        });
      }
    }

    return devs;
  }

  async fetchIssues(config: PmAdapterConfig, since?: string): Promise<PmIssue[]> {
    const client = this.createClient(config);
    const issues: PmIssue[] = [];

    if (!config.workspace_id) return issues;

    // Use filtered team tasks endpoint — single traversal for all tasks in workspace
    let page = 0;

    while (true) {
      const params: any = {
        page,
        include_closed: true,
        subtasks: true,
        order_by: 'updated',
        reverse: true,
      };
      if (since) params.date_updated_gt = new Date(since).getTime();

      try {
        const { data } = await client.get(`/team/${config.workspace_id}/task`, { params });

        for (const task of data.tasks || []) {
          issues.push({
            external_id: task.id,
            external_key: task.custom_id || task.id.slice(0, 8),
            title: task.name,
            type: task.type?.name?.toLowerCase() || 'task',
            status: task.status?.status || 'Unknown',
            status_category: this.mapStatus(task.status?.type),
            priority: task.priority?.priority || 'normal',
            assignee_external_id: task.assignees?.[0]?.id?.toString(),
            assignee_name: task.assignees?.[0]?.username,
            story_points: task.points,
            created_at: new Date(parseInt(task.date_created)).toISOString(),
            updated_at: new Date(parseInt(task.date_updated)).toISOString(),
            resolved_at: task.date_closed ? new Date(parseInt(task.date_closed)).toISOString() : undefined,
          });
        }

        if (!data.tasks || data.tasks.length === 0 || data.last_page) break;
        page++;
      } catch {
        break;
      }
    }

    return issues;
  }

  async fetchSprints(config: PmAdapterConfig): Promise<PmSprint[]> {
    return [];
  }

  async fetchIssueTransitions(config: PmAdapterConfig, taskId: string): Promise<PmTransition[]> {
    return [];
  }

  private mapStatus(type?: string): string {
    if (!type) return 'todo';
    switch (type) {
      case 'closed': case 'done': return 'done';
      case 'active': return 'in_progress';
      case 'open': return 'todo';
      default: return 'todo';
    }
  }
}
