# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email the maintainers directly with details of the vulnerability
3. Include steps to reproduce, impact assessment, and suggested fix if possible

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Security Considerations

- **Tokens are encrypted at rest** using AES-256-CBC before storing in the database
- **Database-per-tenant** isolation prevents cross-tenant data access
- **JWT authentication** with configurable expiration
- **Rate limiting** on all external API calls to prevent abuse
- All secrets must be provided via environment variables — never hardcoded
- The `.env` file is gitignored and must never be committed

## Environment Security

- `ENCRYPTION_KEY`: Must be a unique 32-character key. Changing it invalidates all stored tokens.
- `JWT_SECRET`: Must be a strong random string. Changing it invalidates all active sessions.
- `POSTGRES_PASSWORD`: Use a strong password, especially in production.
- Integration tokens (GitLab, GitHub, Jira, ClickUp) are encrypted before storage.
