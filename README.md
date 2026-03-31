# DevAgent

Multi-tenant developer efficiency platform. Connects to Git (GitHub, GitLab) and PM (Jira, ClickUp) tools, syncs developer activity data on a configurable schedule, and generates team efficiency reports.

## Architecture

```
React SPA ──▶ NestJS API ──▶ PostgreSQL (DB-per-tenant)
                  │
             Sync Worker ──▶ GitHub / GitLab / Jira / ClickUp APIs
              (BullMQ)
                  │
               Redis
```

- **Multi-tenancy**: Each company gets its own PostgreSQL database
- **Integrations**: GitHub, GitLab (CE/EE), Jira Cloud, ClickUp
- **Sync**: Configurable frequency with BullMQ job scheduler
- **Rate limiting**: Per-provider token bucket (respects API limits)
- **Reports**: 14-section developer efficiency dashboard

## Quick Start

```bash
cp .env.example .env
# Edit .env with your database password, JWT secret, and encryption key
docker compose up --build
```

- **Frontend**: http://localhost:5175
- **API**: http://localhost:3005/api

## Setup Flow

1. Sign up (creates your company tenant + dedicated database)
2. Add integrations (GitLab, GitHub, Jira, ClickUp) with API tokens
3. Click "Test" to verify connection (auto-detects field mappings for Jira)
4. Fetch developers from connected sources
5. Select which developers to track, link cross-platform identities
6. Trigger a sync or set a recurring schedule
7. View the efficiency report

## Report Sections

Overview, Team Health, Developer Profiles, Quality Scorecard, Jira Tasks, Sprint Velocity, Cycle Time, Blockers, Work Patterns, Traceability, CI/CD, Bus Factor, MR Health, Recommendations

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | NestJS, TypeORM, BullMQ |
| Frontend | React, Vite, TypeScript |
| Database | PostgreSQL 16 (DB-per-tenant) |
| Queue | Redis 7 + BullMQ |
| Infra | Docker Compose |

## Environment Variables

See [.env.example](.env.example) for all required variables.

## Project Structure

```
devagent/
├── backend/src/
│   ├── common/           # Guards, middleware, decorators, encryption
│   ├── database/         # System + tenant entities, connection service
│   ├── integrations/     # Provider adapters (GitLab, GitHub, Jira, ClickUp)
│   ├── modules/          # Auth, tenants, integrations, developers, sync, reports
│   └── worker/           # Sync processor, collectors, analyzers
├── frontend/src/
│   ├── pages/admin/      # Dashboard, integrations, developers, sync settings
│   └── pages/reports/    # 14-section efficiency report
├── scripts/              # DB init SQL
├── docker-compose.yml
└── .env.example
```

## License

MIT
