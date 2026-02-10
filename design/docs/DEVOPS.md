# DevOps Documentation

This document explains the DevOps infrastructure for the pxlhut-server application.

---

## Table of Contents

1. [Docker Configuration](#docker-configuration)
2. [CI/CD Pipelines](#cicd-pipelines)
3. [Git Hooks](#git-hooks)
4. [Deployment Guide](#deployment-guide)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## Docker Configuration

### Files Overview

| File                         | Environment | Purpose                            |
| ---------------------------- | ----------- | ---------------------------------- |
| `Dockerfile`                 | Production  | Multi-stage optimized build        |
| `Dockerfile.dev`             | Development | Hot reload enabled                 |
| `docker-compose.dev.yml`     | Development | Full stack with PostgreSQL & Redis |
| `docker-compose.prod.yml`    | Production  | App only (uses external DB/Redis)  |
| `docker-compose.staging.yml` | Staging     | Similar to prod with debug logging |

### Production Dockerfile Stages

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: deps                                              │
│  - Installs production dependencies only                    │
│  - Uses pnpm with cache mounting for speed                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Stage 2: builder                                           │
│  - Installs all dependencies (including devDependencies)    │
│  - Generates Prisma client                                  │
│  - Builds the NestJS application                            │
│  - Prunes dev dependencies                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Stage 3: runner                                            │
│  - Minimal Alpine image                                     │
│  - Non-root user (security)                                 │
│  - Only production artifacts copied                         │
│  - Uses dumb-init for proper signal handling                │
└─────────────────────────────────────────────────────────────┘
```

### Common Docker Commands

```bash
# Development
pnpm docker:up          # Start development stack
pnpm docker:down        # Stop and remove containers
pnpm docker:logs        # View app logs
pnpm docker:restart     # Restart app container

# Production build
docker build -t pxlhut-server:latest .
docker run -p 8080:8080 --env-file .env pxlhut-server:latest

# Staging
docker compose -f docker-compose.staging.yml up -d

# Production
docker compose -f docker-compose.prod.yml up -d
```

### Modifying Docker Configuration

**To change Node.js version:**

```dockerfile
# In Dockerfile and Dockerfile.dev
FROM node:22-alpine AS base  # Change from 20 to 22
```

**To add system dependencies:**

```dockerfile
# In the runner stage
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    curl \
    dumb-init \
    your-new-package \  # Add here
    && rm -rf /var/cache/apk/*
```

**To change resource limits (production):**

```yaml
# In docker-compose.prod.yml
deploy:
  resources:
    limits:
      cpus: '2' # Increase CPU
      memory: 1024M # Increase memory
```

---

## CI/CD Pipelines

### Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Pull Request                             │
│  Triggers: ci.yml                                           │
│  Actions: Lint → Type-check → Unit Tests → E2E Tests        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Push to 'develop' branch                     │
│  Triggers: cd-staging.yml                                   │
│  Actions: Build Docker → Push to Registry → Deploy Staging  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│            Push to 'main' branch or version tag             │
│  Triggers: cd-production.yml                                │
│  Actions: Build Docker → Push to Registry → Deploy Prod     │
└─────────────────────────────────────────────────────────────┘
```

### Workflow Files

| File                                  | Trigger             | Purpose             |
| ------------------------------------- | ------------------- | ------------------- |
| `.github/workflows/ci.yml`            | PRs to main/develop | Quality checks      |
| `.github/workflows/cd-staging.yml`    | Push to develop     | Staging deploy      |
| `.github/workflows/cd-production.yml` | Push to main, tags  | Production deploy   |
| `.github/dependabot.yml`              | Weekly schedule     | Auto dependency PRs |

### CI Workflow Jobs

1. **lint** - Runs ESLint and TypeScript type-check
2. **test** - Runs unit tests with coverage
3. **test-e2e** - Runs E2E tests with PostgreSQL and Redis services
4. **build** - Verifies Docker image builds successfully

### Modifying CI/CD

**To add a new check to CI:**

```yaml
# In .github/workflows/ci.yml, add a new job:
security-scan:
  name: Security Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Run security scan
      run: pnpm audit
```

**To change Node.js version:**

```yaml
# In .github/workflows/ci.yml
env:
  NODE_VERSION: '22' # Change from 20
```

**To skip CI on certain commits:**

```bash
git commit -m "docs: update readme [skip ci]"
```

### Required GitHub Secrets

| Secret                          | Used In                   | Purpose                   |
| ------------------------------- | ------------------------- | ------------------------- |
| `GITHUB_TOKEN`                  | All workflows             | Auto-provided by GitHub   |
| `RAILWAY_TOKEN`                 | cd-staging, cd-production | Railway deployment        |
| `RENDER_DEPLOY_HOOK_STAGING`    | cd-staging                | Render staging webhook    |
| `RENDER_DEPLOY_HOOK_PRODUCTION` | cd-production             | Render production webhook |
| `STAGING_HOST`                  | cd-staging                | VPS IP address            |
| `STAGING_USER`                  | cd-staging                | SSH username              |
| `STAGING_SSH_KEY`               | cd-staging                | SSH private key           |
| `PRODUCTION_HOST`               | cd-production             | VPS IP address            |
| `PRODUCTION_USER`               | cd-production             | SSH username              |
| `PRODUCTION_SSH_KEY`            | cd-production             | SSH private key           |

### GitHub Environments

Create these environments in your GitHub repository settings:

- **staging** - For develop branch deployments
- **production** - For main branch deployments (add protection rules)

---

## Git Hooks

### Husky Configuration

Husky runs scripts at specific Git lifecycle events.

| Hook       | File                | What it does             |
| ---------- | ------------------- | ------------------------ |
| pre-commit | `.husky/pre-commit` | Runs lint-staged         |
| commit-msg | `.husky/commit-msg` | Validates commit message |

### lint-staged Configuration

Located in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"],
    "prisma/schema.prisma": ["prisma format"]
  }
}
```

**To add new file types:**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.css": ["stylelint --fix", "prettier --write"] // Add this
  }
}
```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Allowed Types:**

| Type       | Description                 |
| ---------- | --------------------------- |
| `feat`     | New feature                 |
| `fix`      | Bug fix                     |
| `docs`     | Documentation               |
| `style`    | Formatting (no code change) |
| `refactor` | Code restructuring          |
| `perf`     | Performance improvement     |
| `test`     | Adding/updating tests       |
| `build`    | Build system changes        |
| `ci`       | CI/CD changes               |
| `chore`    | Maintenance                 |
| `deps`     | Dependency updates          |

**Examples:**

```bash
feat(stock): add inventory alerts
fix(auth): resolve token expiration bug
docs(readme): update installation steps
chore(deps): update nestjs to v11
```

### Modifying Commitlint Rules

Edit `commitlint.config.js`:

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Add custom type
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'deps',
        'wip', // Add work-in-progress type
      ],
    ],
    // Change max length
    'subject-max-length': [2, 'always', 150],
  },
};
```

### Temporarily Bypassing Hooks

```bash
# Skip pre-commit hook
git commit --no-verify -m "feat: emergency fix"

# Skip all hooks
HUSKY=0 git commit -m "feat: emergency fix"
```

> ⚠️ **Warning:** Only bypass hooks in emergencies. CI will still run checks.

---

## Deployment Guide

### Option 1: Railway (Recommended for simplicity)

1. Create account at [railway.app](https://railway.app)
2. Create new project and add PostgreSQL + Redis services
3. Get your project token from Settings → Tokens
4. Add `RAILWAY_TOKEN` to GitHub secrets
5. Uncomment Railway deployment section in workflow files

### Option 2: Render

1. Create account at [render.com](https://render.com)
2. Create a new Web Service connected to your repo
3. Get deploy hook URL from Service Settings
4. Add `RENDER_DEPLOY_HOOK_*` secrets to GitHub
5. Uncomment Render deployment section in workflow files

### Option 3: VPS (Docker)

1. Set up your VPS with Docker installed
2. Clone the repository on the server
3. Create `.env` file with production values
4. Add SSH credentials to GitHub secrets
5. Uncomment VPS deployment section in workflow files

**VPS Deployment Commands:**

```bash
# On server
cd /opt/pxlhut-server
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker image prune -f
```

### Database Migrations in Production

Migrations are NOT automatically run. After deployment:

```bash
# Option 1: Run in container
docker exec pxlhut-server pnpm exec prisma migrate deploy

# Option 2: Add to deployment script
docker compose -f docker-compose.prod.yml exec app \
  pnpm exec prisma migrate deploy
```

---

## Environment Variables

### Required Variables

| Variable         | Description                  | Example                               |
| ---------------- | ---------------------------- | ------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL`      | Redis connection string      | `redis://host:6379`                   |
| `SESSION_SECRET` | Session encryption key       | 32+ character random string           |
| `CSRF_SECRET`    | CSRF token secret            | Random string                         |
| `FRONTEND_URL`   | Allowed frontend origin      | `https://app.example.com`             |

### Environment Files

| File               | Purpose                                    | Git tracked? |
| ------------------ | ------------------------------------------ | ------------ |
| `.env.example`     | Template for developers                    | ✅ Yes       |
| `.env`             | Local development (copy from .env.example) | ❌ No        |
| `.env.development` | Docker development                         | ❌ No        |
| `.env.staging`     | Staging environment                        | ❌ No        |
| `.env.production`  | Production environment                     | ❌ No        |

---

## Troubleshooting

### Docker Build Fails

**Error: `husky: not found`**

- Fixed by using `--ignore-scripts` flag in Dockerfile
- If reoccurs, ensure all `pnpm install` and `pnpm prune` commands have this flag

**Error: `prisma: not found`**

- Normal during production build (uses fallback message)
- Prisma generate runs separately with explicit DATABASE_URL

### CI Workflow Fails

**E2E tests timeout:**

- Check if PostgreSQL/Redis services are healthy
- Increase `start_period` in service health checks

**Lint errors:**

- Run `pnpm lint` locally to see issues
- Auto-fix with `pnpm lint --fix`

### Commit Rejected by Husky

**Invalid commit message:**

```
✖ subject must not be empty [subject-empty]
```

Use conventional format: `git commit -m "feat: your message"`

**Lint-staged fails:**

- Fix ESLint errors in staged files
- Or bypass with `git commit --no-verify` (not recommended)

### Deployment Issues

**Container keeps restarting:**

1. Check logs: `docker logs pxlhut-server`
2. Verify environment variables are set
3. Ensure DATABASE_URL and REDIS_URL are accessible

**Health check failing:**

- Ensure `/health` endpoint returns 200
- Check if app is binding to port 8080
- Verify no startup errors in logs

---

## Quick Reference

### Daily Commands

```bash
# Start development
pnpm docker:up

# View logs
pnpm docker:logs

# Run tests
pnpm test

# Commit changes
git commit -m "feat(module): description"

# Push changes
git push origin develop
```

### Release Workflow

```bash
# 1. Merge to develop (triggers staging deploy)
git checkout develop
git merge feat/my-feature
git push origin develop

# 2. After testing staging, merge to main
git checkout main
git merge develop
git push origin main

# 3. Create version tag (triggers production deploy)
git tag v1.2.0
git push origin v1.2.0
```
