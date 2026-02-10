<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

<h1 align="center">Invetrixa Server</h1>

<p align="center">
  A production-grade, multi-tenant SaaS inventory management system built with NestJS and TypeScript.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node.js" />
  <img src="https://img.shields.io/badge/pnpm-%3E%3D9-F69220" alt="pnpm" />
  <img src="https://img.shields.io/badge/license-UNLICENSED-blue" alt="License" />
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Docker Development](#-docker-development)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)

---

## 🔍 Overview

**Invetrixa** is a comprehensive, enterprise-level inventory management platform designed as a **multi-tenant SaaS application**. It provides businesses with tools to manage products, stock, point-of-sale operations, invoicing, customer/supplier relationships, and more — all within a secure, scalable, and modular architecture.

The backend is built with **NestJS 11**, uses **Prisma ORM** with **PostgreSQL**, and leverages **Redis** for session management and background job processing via **BullMQ**.

---

## ✨ Key Features

### Core Business Modules

| Module                       | Description                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| **🏢 Multi-Tenancy**         | Isolated tenant workspaces with tenant-specific data, locations, and configurations |
| **🔐 Authentication**        | Session-based auth with Passport.js, OTP verification, and onboarding flow          |
| **🛡️ Access Control (RBAC)** | Role-based permissions with module-level granularity and auto-initialized roles     |
| **📦 Product Management**    | Full product catalog with category organization                                     |
| **📊 Stock Management**      | Comprehensive inventory tracking with stock movements and adjustments               |
| **🛒 Point of Sale (POS)**   | Complete POS system with cart management, sales processing, and terminal support    |
| **🧾 Invoice Generation**    | Automated invoice creation with customizable templates                              |
| **👥 Customer Management**   | Customer profiles and transaction history                                           |
| **🏭 Supplier Management**   | Supplier directory and procurement tracking                                         |
| **📍 Location Management**   | Multi-location support per tenant                                                   |
| **📦 Packages & Plans**      | Subscription packages and feature gating                                            |

### Technical Highlights

- **🔒 Enterprise Security** — Helmet, CSRF protection, rate limiting, request timeouts, and response sanitization
- **📝 API Versioning** — URI-based versioning (`/api/v1/...`) for backward-compatible API evolution
- **📚 Swagger/OpenAPI** — Auto-generated interactive API documentation at `/api-docs` (development only)
- **⚡ Background Jobs** — BullMQ + Redis for async task processing (email queues, etc.)
- **✅ Zod Validation** — Strict environment variable validation with fail-fast startup behavior
- **🔄 Global Interceptors** — Logging, timeout, response transformation, and sensitive field sanitization
- **🩺 Health Checks** — Built-in `/health` endpoint for container orchestration and monitoring
- **📧 Email Service** — SMTP-based email delivery via Nodemailer

---

## 🛠 Tech Stack

| Category             | Technologies                                           |
| -------------------- | ------------------------------------------------------ |
| **Runtime**          | Node.js 20, TypeScript 5.9                             |
| **Framework**        | NestJS 11                                              |
| **ORM**              | Prisma 7.3 (multi-schema setup with 13 domain schemas) |
| **Database**         | PostgreSQL 17                                          |
| **Cache / Queues**   | Redis 7, BullMQ                                        |
| **Authentication**   | Passport.js, express-session, connect-redis, Argon2    |
| **Validation**       | class-validator, class-transformer, Zod                |
| **API Docs**         | Swagger / OpenAPI (`@nestjs/swagger`)                  |
| **Security**         | Helmet, csrf-csrf, @nestjs/throttler                   |
| **Testing**          | Jest, Supertest                                        |
| **Containerization** | Docker, Docker Compose (dev / staging / prod)          |
| **CI/CD**            | GitHub Actions (CI, CD-staging, CD-production)         |
| **Code Quality**     | ESLint, Prettier, Husky, lint-staged, commitlint       |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (Frontend)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                    NestJS Application                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Middleware Chain                                      │  │
│  │  Helmet → CORS → CSRF → Session → Passport → Logger   │  │
│  └───────────────────────┬────────────────────────────────┘  │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │  Global Guards & Interceptors                          │  │
│  │  ThrottlerGuard → OnboardingGuard                      │  │
│  │  LoggingInterceptor → TimeoutInterceptor               │  │
│  │  SanitizeResponseInterceptor → TransformInterceptor    │  │
│  └───────────────────────┬────────────────────────────────┘  │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │  Feature Modules                                       │  │
│  │  Auth │ Tenants │ Users │ Products │ Stock │ POS       │  │
│  │  Invoice │ Customer │ Supplier │ Category │ Location   │  │
│  │  Access-Control │ Packages │ Modules-Definition        │  │
│  └───────────────────────┬────────────────────────────────┘  │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │  Shared Services                                       │  │
│  │  PrismaService │ RedisService │ EmailService │ Utils   │  │
│  └───────────────────────┬────────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │PostgreSQL│ │  Redis   │ │  BullMQ  │
        │   17     │ │    7     │ │  Queues  │
        └──────────┘ └──────────┘ └──────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Docker** & **Docker Compose** (recommended)
- **PostgreSQL** 17 (if running without Docker)
- **Redis** 7 (if running without Docker)

### Quick Start (Docker — Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Asadullah246/invetrixa-server.git
cd invetrixa-server

# 2. Copy the example env file
cp .env.example .env.development

# 3. Start all services (app + Postgres + Redis)
pnpm docker:dev

# 4. (Optional) Start dev tools — pgAdmin, Redis Insight, Portainer
pnpm docker:up:tools
```

The API will be available at `http://localhost:8080` and Swagger docs at `http://localhost:8080/api-docs`.

### Local Development (Without Docker)

```bash
# 1. Install dependencies
pnpm install

# 2. Set up your .env.development file
cp .env.example .env.development
# Edit .env.development with your local PostgreSQL and Redis connection details

# 3. Generate Prisma Client
pnpm prisma:generate

# 4. Push schema to database
pnpm exec prisma db push

# 5. (Optional) Seed the database
pnpm prisma:seed

# 6. Start the dev server
pnpm start:dev
```

---

## ⚙️ Environment Configuration

This project uses a **strict single-file approach** per environment — no cascading `.env` fallbacks.

| File               | Environment | Usage                                     |
| ------------------ | ----------- | ----------------------------------------- |
| `.env.development` | Development | Docker & local development                |
| `.env.test`        | Test        | Unit, integration & E2E tests             |
| `.env.production`  | Production  | Production deployment (**not committed**) |

All environment variables are **validated at startup** using Zod. Missing or invalid variables will cause the application to **fail fast** with descriptive error messages.

> See [`.env.example`](.env.example) for the full list of supported variables.

---

## 🐳 Docker Development

The project ships with pre-configured Docker Compose files for multiple environments:

| File                         | Purpose                                             |
| ---------------------------- | --------------------------------------------------- |
| `docker-compose.dev.yml`     | Development with hot-reload, pgAdmin, Redis Insight |
| `docker-compose.staging.yml` | Staging environment                                 |
| `docker-compose.prod.yml`    | Production deployment                               |

### Useful Commands

```bash
# Start / Stop
pnpm docker:up                 # Start app + Postgres + Redis
pnpm docker:down               # Stop all containers
pnpm docker:restart             # Restart app container only

# Database
pnpm docker:migrate             # Run Prisma migrations
pnpm docker:seed                # Seed the database
pnpm docker:reset:db            # Reset database (⚠️ destructive)
pnpm docker:studio              # Open Prisma Studio (port 5555)

# Monitoring
pnpm docker:logs                # Stream app logs
pnpm docker:logs:all            # Stream all service logs
pnpm docker:ps                  # List running containers
pnpm docker:shell               # Open shell in app container

# Testing inside Docker
pnpm docker:test                # Unit tests
pnpm docker:test:e2e            # E2E tests
pnpm docker:test:integration    # Integration tests
```

---

## 📖 API Documentation

Interactive Swagger documentation is available in development mode:

- **URL**: `http://localhost:8080/api-docs`
- **Authentication**: Session-based (cookie `connect.sid`)
- **Multi-tenant Header**: `x-tenant-id` (required for tenant-specific endpoints)
- **Location Header**: `x-location-id` (for location-specific operations)

> Swagger is automatically disabled in production for security.

---

## 🧪 Testing

```bash
# Unit Tests
pnpm test                 # Run all unit tests
pnpm test:watch           # Watch mode
pnpm test:cov             # With coverage report

# E2E Tests (requires running Postgres + Redis)
pnpm test:e2e

# Integration Tests
pnpm test:integration
```

---

## 🔄 CI/CD Pipeline

The project uses **GitHub Actions** with three workflows:

| Workflow          | Trigger                             | Steps                                                     |
| ----------------- | ----------------------------------- | --------------------------------------------------------- |
| **CI**            | Pull requests to `main` / `develop` | Lint → Type-check → Unit tests → E2E tests → Docker build |
| **CD Staging**    | Push to `develop`                   | Build → Deploy to staging                                 |
| **CD Production** | Push to `main`                      | Build → Deploy to production                              |

CI runs lint, type-check, and unit tests **in parallel** with E2E tests (using service containers for Postgres 17 + Redis 7).

---

## 📁 Project Structure

```
invetrixa-server/
├── .github/                  # GitHub Actions workflows & templates
│   └── workflows/
│       ├── ci.yml            # CI pipeline
│       ├── cd-staging.yml    # Staging deployment
│       └── cd-production.yml # Production deployment
├── prisma/
│   ├── schemas/              # Multi-file Prisma schema (13 domain models)
│   ├── migrations/           # Database migration history
│   └── seed/                 # Database seeders
├── src/
│   ├── bootstrap/            # App initialization (security, CORS, Swagger)
│   ├── config/               # Typed config namespaces & Zod validation
│   ├── common/               # Shared utilities, DTOs, guards, interceptors
│   │   ├── constants/        # Application constants
│   │   ├── decorator/        # Custom decorators
│   │   ├── dto/              # Shared DTOs & API response types
│   │   ├── filter/           # Global exception filter
│   │   ├── interceptors/     # Global interceptors
│   │   ├── middleware/       # Custom middleware (security, logging)
│   │   ├── prisma/           # Prisma service
│   │   ├── services/         # Shared services (email, etc.)
│   │   ├── utils/            # Utility functions
│   │   └── validator/        # Custom validators
│   ├── modules/
│   │   ├── auth/             # Authentication & authorization
│   │   ├── tenants/          # Multi-tenant management
│   │   ├── users/            # User management
│   │   ├── product/          # Product catalog
│   │   ├── category/         # Product categories
│   │   ├── stock/            # Inventory & stock management
│   │   ├── pos/              # Point of Sale system
│   │   ├── invoice/          # Invoice generation
│   │   ├── customer/         # Customer management
│   │   ├── supplier/         # Supplier management
│   │   ├── location/         # Location management
│   │   ├── access-control/   # RBAC system
│   │   ├── packages/         # Subscription packages
│   │   ├── modules-definition/ # Module feature definitions
│   │   └── health/           # Health check endpoint
│   └── redis/                # Redis service & module
├── test/                     # E2E & integration test suites
├── docker-compose.dev.yml    # Development Docker Compose
├── docker-compose.staging.yml
├── docker-compose.prod.yml
├── Dockerfile                # Multi-stage production build
└── Dockerfile.dev            # Development Dockerfile
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Setting up your development environment
- Commit message conventions (Conventional Commits)
- Pull request process
- Code style & testing requirements
- Branch strategy (`main` → `develop` → `feat/*`)

---

<p align="center">
  Built with ❤️ using <a href="https://nestjs.com">NestJS</a>
</p>
