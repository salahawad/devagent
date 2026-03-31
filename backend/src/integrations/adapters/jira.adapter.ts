import axios, { AxiosInstance } from 'axios';
import { PmAdapter, PmAdapterConfig, PmDeveloper, PmIssue, PmSprint, PmTransition, PmFieldMapping } from './pm.adapter';
import { getRateLimiter } from '../rate-limiter';

export class JiraAdapter implements PmAdapter {
  private delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  private createClient(config: PmAdapterConfig): AxiosInstance {
    const auth = Buffer.from(`${config.email}:${config.token}`).toString('base64');
    const client = axios.create({
      baseURL: `${config.base_url}/rest/api/3`,
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
      timeout: 30000,
    });
    const limiter = getRateLimiter('jira');
    client.interceptors.request.use(async (cfg) => { await limiter.acquire(); return cfg; });
    return client;
  }

  private createAgileClient(config: PmAdapterConfig): AxiosInstance {
    const auth = Buffer.from(`${config.email}:${config.token}`).toString('base64');
    const client = axios.create({
      baseURL: `${config.base_url}/rest/agile/1.0`,
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
      timeout: 30000,
    });
    const limiter = getRateLimiter('jira');
    client.interceptors.request.use(async (cfg) => { await limiter.acquire(); return cfg; });
    return client;
  }

  async testConnection(config: PmAdapterConfig): Promise<boolean> {
    try {
      const client = this.createClient(config);
      await client.get('/myself');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Auto-detect which custom fields correspond to Story Points and Sprint.
   * Scans all fields in the Jira instance and picks by name pattern.
   * Returns a mapping that can be stored in integration config.
   */
  async detectFields(config: PmAdapterConfig): Promise<PmFieldMapping> {
    const client = this.createClient(config);
    const mapping: PmFieldMapping = {};

    try {
      const { data: fields } = await client.get('/field');

      // Priority order for story points: exact "Story Points" > "Story point estimate" > effort
      const spCandidates: Array<{ id: string; priority: number }> = [];
      let sprintField: string | undefined;

      for (const f of fields) {
        const name = (f.name || '').toLowerCase();
        const id = f.id;
        const type = f.schema?.type;

        // Sprint field (always an array)
        if (name === 'sprint' && type === 'array') {
          sprintField = id;
        }

        // Story points candidates
        if (name === 'story points' && type === 'number') {
          spCandidates.push({ id, priority: 1 });
        } else if (name === 'story point estimate' && type === 'number') {
          spCandidates.push({ id, priority: 2 });
        } else if (name === 'effort' && type === 'number' && id.startsWith('customfield_')) {
          spCandidates.push({ id, priority: 3 });
        }
      }

      // Pick highest priority SP field
      spCandidates.sort((a, b) => a.priority - b.priority);
      if (spCandidates.length > 0) {
        mapping.story_points_field = spCandidates[0].id;
      }

      mapping.sprint_field = sprintField || 'customfield_10020';
      mapping.estimate_field = 'timeoriginalestimate'; // Always available

      console.log('[JiraAdapter] Detected field mapping:', mapping);
    } catch {
      // Fallback defaults
      mapping.story_points_field = 'customfield_10016';
      mapping.sprint_field = 'customfield_10020';
      mapping.estimate_field = 'timeoriginalestimate';
    }

    return mapping;
  }

  async fetchDevelopers(config: PmAdapterConfig): Promise<PmDeveloper[]> {
    const client = this.createClient(config);
    const devs: PmDeveloper[] = [];

    try {
      // Search for users assignable to the project
      const { data } = await client.get('/users/search', {
        params: { maxResults: 200 },
      });

      for (const u of data) {
        if (u.accountType !== 'atlassian') continue;
        devs.push({
          external_id: u.accountId,
          username: u.emailAddress || u.displayName,
          display_name: u.displayName,
          email: u.emailAddress,
          avatar_url: u.avatarUrls?.['48x48'],
        });
      }
    } catch {
      // Fallback: try project-level user search
    }

    return devs;
  }

  async fetchIssues(config: PmAdapterConfig, since?: string): Promise<PmIssue[]> {
    const client = this.createClient(config);

    // Use detected/configured field mapping, or fallbacks
    const fm = config.field_mapping || {};
    const spField = fm.story_points_field || 'customfield_10034';
    const sprintField = fm.sprint_field || 'customfield_10020';
    const estimateField = fm.estimate_field || 'timeoriginalestimate';

    const conditions: string[] = [];
    if (config.project_key) conditions.push(`project = "${config.project_key}"`);
    if (since) {
      conditions.push(`updated >= "${since.split('T')[0]}"`);
    } else {
      conditions.push('updated >= -365d');
    }
    const jql = conditions.join(' AND ') + ' ORDER BY updated DESC';

    // Step 1: Fetch issue keys only (up to 5000 per page)
    const issueKeys: string[] = [];
    let nextPageToken: string | undefined = undefined;

    while (true) {
      const params: any = { jql, maxResults: 5000, fields: 'key' };
      if (nextPageToken) params.nextPageToken = nextPageToken;

      const { data } = await client.get('/search/jql', { params });

      for (const issue of data.issues || []) {
        issueKeys.push(issue.key);
      }

      if (data.isLast || !data.nextPageToken || !data.issues?.length) break;
      nextPageToken = data.nextPageToken;
    }

    if (issueKeys.length === 0) return [];

    // Step 2: Bulk fetch full details in batches of 100
    const issues: PmIssue[] = [];
    const batchSize = 100;
    const fieldsToFetch = [
      'summary', 'issuetype', 'status', 'priority', 'assignee',
      spField, sprintField, estimateField,
      'created', 'updated', 'resolutiondate',
    ].join(',');

    for (let i = 0; i < issueKeys.length; i += batchSize) {
      const batch = issueKeys.slice(i, i + batchSize);
      const batchJql = `key in (${batch.join(',')})`;

      try {
        const { data } = await client.get('/search/jql', {
          params: { jql: batchJql, maxResults: batchSize, fields: fieldsToFetch },
        });

        for (const issue of data.issues || []) {
          const fields = issue.fields;

          // Sprint: pick last sprint from the array (most recent)
          const sprintArr = fields[sprintField];
          const sprint = Array.isArray(sprintArr) && sprintArr.length > 0
            ? sprintArr[sprintArr.length - 1]
            : null;

          // Story points: detected field → fallback to time estimate in hours
          const storyPoints = fields[spField]
            ?? (fields[estimateField]
              ? Math.round(fields[estimateField] / 3600 * 10) / 10
              : null);

          issues.push({
            external_id: issue.id,
            external_key: issue.key,
            title: fields.summary,
            type: fields.issuetype?.name?.toLowerCase() || 'task',
            status: fields.status?.name || 'Unknown',
            status_category: this.mapStatusCategory(fields.status?.statusCategory?.key),
            priority: fields.priority?.name || 'Medium',
            assignee_external_id: fields.assignee?.accountId,
            assignee_name: fields.assignee?.displayName,
            story_points: storyPoints,
            sprint_name: sprint?.name,
            sprint_start: sprint?.startDate,
            sprint_end: sprint?.endDate,
            created_at: fields.created,
            updated_at: fields.updated,
            resolved_at: fields.resolutiondate,
          });
        }
      } catch {
        // If batch fails, skip it
      }
    }

    return issues;
  }

  async fetchSprints(config: PmAdapterConfig): Promise<PmSprint[]> {
    const agileClient = this.createAgileClient(config);
    const sprints: PmSprint[] = [];

    try {
      // First find board IDs
      const { data: boardsData } = await agileClient.get('/board', {
        params: { maxResults: 50 },
      });

      for (const board of boardsData.values || []) {
        try {
          const { data: sprintsData } = await agileClient.get(`/board/${board.id}/sprint`, {
            params: { maxResults: 50 },
          });

          for (const s of sprintsData.values || []) {
            sprints.push({
              external_id: String(s.id),
              name: s.name,
              state: s.state,
              start_date: s.startDate,
              end_date: s.endDate,
            });
          }
        } catch {
          // Skip boards without sprint support
        }
      }
    } catch {
      // Board API may not be available
    }

    return sprints;
  }

  async fetchIssueTransitions(config: PmAdapterConfig, issueKey: string): Promise<PmTransition[]> {
    const client = this.createClient(config);
    const transitions: PmTransition[] = [];

    try {
      const { data } = await client.get(`/issue/${issueKey}/changelog`, {
        params: { maxResults: 100 },
      });

      for (const history of data.values || []) {
        for (const item of history.items || []) {
          if (item.field === 'status') {
            transitions.push({
              from_status: item.fromString || '',
              to_status: item.toString || '',
              transitioned_at: history.created,
            });
          }
        }
      }
    } catch {
      // Changelog may not be accessible
    }

    return transitions;
  }

  private mapStatusCategory(key?: string): string {
    if (!key) return 'todo';
    switch (key) {
      case 'done': return 'done';
      case 'indeterminate': return 'in_progress';
      case 'new': return 'todo';
      default: return 'todo';
    }
  }
}
