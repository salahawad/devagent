import { GitAdapter } from './adapters/git.adapter';
import { PmAdapter } from './adapters/pm.adapter';
import { GitLabAdapter } from './adapters/gitlab.adapter';
import { GitHubAdapter } from './adapters/github.adapter';
import { JiraAdapter } from './adapters/jira.adapter';
import { ClickUpAdapter } from './adapters/clickup.adapter';

export class IntegrationFactory {
  static getGitAdapter(provider: string): GitAdapter {
    switch (provider) {
      case 'gitlab': return new GitLabAdapter();
      case 'github': return new GitHubAdapter();
      default: throw new Error(`Unknown git provider: ${provider}`);
    }
  }

  static getPmAdapter(provider: string): PmAdapter {
    switch (provider) {
      case 'jira': return new JiraAdapter();
      case 'clickup': return new ClickUpAdapter();
      default: throw new Error(`Unknown PM provider: ${provider}`);
    }
  }
}
