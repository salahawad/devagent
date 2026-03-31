export interface GitAdapterConfig {
  base_url: string;
  token: string;
  group_id?: string;
}

export interface GitDeveloper {
  external_id: string;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
}

export interface GitRepository {
  external_id: string;
  name: string;
  full_name: string;
  url: string;
  default_branch: string;
}

export interface GitCommit {
  sha: string;
  message: string;
  author_email: string;
  author_name: string;
  committed_at: string;
  lines_added: number;
  lines_deleted: number;
  files_changed: number;
}

export interface GitMergeRequest {
  external_id: string;
  title: string;
  state: string;
  author_username: string;
  created_at: string;
  merged_at?: string;
  closed_at?: string;
  review_comments_count: number;
  approvals_count: number;
  additions: number;
  deletions: number;
}

export interface GitPipeline {
  external_id: string;
  ref: string;
  status: string;
  duration_seconds: number;
  created_at: string;
}

export interface GitAdapter {
  testConnection(config: GitAdapterConfig): Promise<boolean>;
  fetchDevelopers(config: GitAdapterConfig): Promise<GitDeveloper[]>;
  fetchRepositories(config: GitAdapterConfig): Promise<GitRepository[]>;
  fetchCommits(config: GitAdapterConfig, repoExternalId: string, since?: string): Promise<GitCommit[]>;
  fetchMergeRequests(config: GitAdapterConfig, repoExternalId: string, since?: string): Promise<GitMergeRequest[]>;
  fetchPipelines(config: GitAdapterConfig, repoExternalId: string, since?: string): Promise<GitPipeline[]>;
}
