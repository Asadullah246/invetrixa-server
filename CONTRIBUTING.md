# Contributing to invetrixa-server

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Git

### Getting Started

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd invetrixa-server
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start development environment:

   ```bash
   # Using Docker (recommended)
   pnpm docker:up

   # Or run locally (requires PostgreSQL & Redis)
   pnpm start:dev
   ```

4. Open Prisma Studio (optional):
   ```bash
   pnpm prisma:studio
   ```

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) to ensure consistent and meaningful commit messages.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type       | Description                                |
| ---------- | ------------------------------------------ |
| `feat`     | New feature                                |
| `fix`      | Bug fix                                    |
| `docs`     | Documentation changes                      |
| `style`    | Formatting, missing semicolons, etc.       |
| `refactor` | Code restructuring without behavior change |
| `perf`     | Performance improvements                   |
| `test`     | Adding or updating tests                   |
| `build`    | Build system or dependencies               |
| `ci`       | CI/CD configuration                        |
| `chore`    | Maintenance tasks                          |
| `deps`     | Dependency updates                         |

### Examples

```bash
feat(stock): add low stock alert notifications
fix(auth): resolve session expiration bug
docs(readme): update installation instructions
refactor(product): simplify pricing calculation
```

## Pull Request Process

1. Create a feature branch from `develop`:

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/your-feature-name
   ```

2. Make your changes and commit using conventional commits.

3. Push your branch and create a Pull Request:

   ```bash
   git push origin feat/your-feature-name
   ```

4. Ensure all CI checks pass.

5. Request review from maintainers.

## Code Style

- **ESLint**: Run `pnpm lint` to check for issues
- **Prettier**: Code is auto-formatted on commit via lint-staged
- **TypeScript**: Run `pnpm type-check` to verify types

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# With coverage
pnpm test:cov
```

## Branch Strategy

| Branch    | Purpose                         |
| --------- | ------------------------------- |
| `main`    | Production-ready code           |
| `develop` | Integration branch for features |
| `feat/*`  | Feature development             |
| `fix/*`   | Bug fixes                       |
| `docs/*`  | Documentation updates           |

## Questions?

If you have questions, please open an issue or reach out to the maintainers.
