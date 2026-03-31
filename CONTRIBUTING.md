# Contributing to DevAgent

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your values
3. Run `docker compose up --build`
4. Frontend: http://localhost:5175
5. API: http://localhost:3005/api

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Ensure the code compiles:
   ```bash
   cd backend && npx tsc --noEmit
   cd frontend && npx tsc --noEmit
   ```
4. Run the linter:
   ```bash
   cd backend && npm run lint
   cd frontend && npm run lint
   ```
5. Test your changes with `docker compose up --build`
6. Open a pull request

## Code Style

- TypeScript strict mode on frontend, relaxed on backend (TypeORM compatibility)
- No hardcoded secrets or credentials — use environment variables
- Use NestJS Logger, not console.log

## Adding a New Integration Provider

1. Create an adapter in `backend/src/integrations/adapters/`
2. Implement the `GitAdapter` or `PmAdapter` interface
3. Register it in `integration.factory.ts`
4. Add rate limit config in `rate-limiter.ts`

## Reporting Issues

Open a GitHub issue with:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
