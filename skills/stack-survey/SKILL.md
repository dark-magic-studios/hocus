---
name: stack-survey
description: Interrogate the project's tech stack — languages, frameworks, tools, dependencies — before scaffolding any agents or configuration.
---

# Stack Survey

Thoroughly examines a project to determine its technology stack. Runs before any scaffolding to ensure agents, configs, and skills are appropriate for the actual technologies in use.

## When to use
- Before `peter-invoke` decides which agents to create
- Before `hocus init` when you need to understand the project
- When onboarding to a new project — get a quick summary of the stack
- Before adding stack-specific skills or agents
- When the project may have been updated since the last survey

## Instructions
1. **Package manifests**
   - Read `package.json` (Node): list dependencies, devDependencies, scripts
   - Read `Cargo.toml` (Rust): dependencies, features, edition
   - Read `pyproject.toml`, `requirements.txt`, `Pipfile` (Python)
   - Read `go.mod` (Go), `Gemfile` (Ruby), `pom.xml` / `build.gradle` (Java/Kotlin)
   - Read `Cargo.toml`, `composer.json`, `paket.dependencies` as applicable
   - Look for monorepo tools: `pnpm-workspace.yaml`, `lerna.json`, `turborepo`, `nx.json`

2. **Framework configs**
   - Frontend: `next.config.js`, `vite.config.ts`, `nuxt.config.ts`, `svelte.config.js`, `angular.json`, `vue.config.js`
   - Backend: `Django` settings, `Rails` config, `express` middleware patterns, `FastAPI` app
   - Check `tsconfig.json` for TypeScript strictness, target, paths
   - Check `.babelrc`, `postcss.config.js`, `tailwind.config.js`, `unocss.config.ts`

3. **Infrastructure signals**
   - `Dockerfile` and `docker-compose.yml` — containerization approach
   - `.github/workflows/` or `.gitlab-ci.yml` or `Jenkinsfile` — CI/CD
   - `Terraform`, `Pulumi`, `CDK` files — IaC
   - `Dockerfile`, `Kubernetes` manifests, `helm` charts
   - `.env.example` or `.env` files — environment configuration

4. **Testing framework**
   - Check for: `jest`, `vitest`, `mocha`, `cypress`, `playwright`, `pytest`, `rspec`, `cargo test`, `go test`
   - Test directory structure: `__tests__/`, `tests/`, `spec/`, `*.test.ts`, `*.spec.ts`
   - Coverage config: `nyc`, `istanbul`, `c8`, `coverage`

5. **Linting and formatting**
   - `.eslintrc*`, `.prettierrc*`, `biome.json`, `rustfmt.toml`, `black`, `ruff`
   - `husky`, `lint-staged`, `commitlint` — git hooks

6. **Compile the report**
   ```
   # Stack Survey — <project>

   ## Languages
   - TypeScript (primary), JavaScript, Rust, Python

   ## Framework
   - Frontend: Next.js 14 (App Router)
   - Backend: none detected (monorepo with API routes)

   ## Database
   - PostgreSQL (via Prisma ORM)

   ## Testing
   - Vitest (unit), Playwright (e2e)

   ## CI/CD
   - GitHub Actions (`.github/workflows/ci.yml`)

   ## Infrastructure
   - Docker, deployed to Fly.io

   ## Monorepo
   - pnpm workspaces + Turborepo

   ## Linting
   - ESLint + Prettier (with Biome migration in progress)

   ## Recommendations
   - Add a `nextjs-frontend` skill for component conventions
   - Add a `prisma-database` skill for migration patterns
   ```
   - Be specific: include version numbers, config paths, and notable deviations from defaults
   - Note if certain config files are missing but expected (e.g., no Dockerfile for a project that deploys to production)
   - Flag any detected inconsistencies (e.g., TypeScript project with no tsconfig)
