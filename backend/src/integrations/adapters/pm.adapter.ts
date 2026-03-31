export interface PmFieldMapping {
  story_points_field?: string;   // e.g. "customfield_10034"
  sprint_field?: string;         // e.g. "customfield_10020"
  estimate_field?: string;       // e.g. "timeoriginalestimate"
}

export interface PmAdapterConfig {
  base_url: string;
  token: string;
  email?: string;
  project_key?: string;
  workspace_id?: string;
  field_mapping?: PmFieldMapping; // Auto-detected or user-overridden
}

export interface PmDeveloper {
  external_id: string;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
}

export interface PmIssue {
  external_id: string;
  external_key: string;
  title: string;
  type: string;
  status: string;
  status_category: string;
  priority: string;
  assignee_external_id?: string;
  assignee_name?: string;
  story_points?: number;
  sprint_name?: string;
  sprint_start?: string;
  sprint_end?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface PmSprint {
  external_id: string;
  name: string;
  state: string;
  start_date?: string;
  end_date?: string;
}

export interface PmTransition {
  from_status: string;
  to_status: string;
  transitioned_at: string;
}

export interface PmAdapter {
  testConnection(config: PmAdapterConfig): Promise<boolean>;
  detectFields?(config: PmAdapterConfig): Promise<PmFieldMapping>;
  fetchDevelopers(config: PmAdapterConfig): Promise<PmDeveloper[]>;
  fetchIssues(config: PmAdapterConfig, since?: string): Promise<PmIssue[]>;
  fetchSprints(config: PmAdapterConfig): Promise<PmSprint[]>;
  fetchIssueTransitions(config: PmAdapterConfig, issueId: string): Promise<PmTransition[]>;
}
