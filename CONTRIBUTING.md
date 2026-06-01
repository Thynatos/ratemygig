# Contributing to ratemygig

Thanks for your interest in contributing! This guide will help you get started.

## Getting Started

1. Fork the repo and clone your fork
2. Install dependencies: `npm install`
3. Copy the env example: `cp .env.example apps/web/.env.local`
4. Start the dev server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

The app runs with mock data by default — no Supabase account needed for most development.

## Project Structure

```
ratemygig/
├── apps/web/        # Vite + React 19 frontend
├── packages/core/   # Shared domain types
├── packages/db/     # SQL migrations & seeds
└── packages/jobs/   # Ticketmaster ingestion job
```

## Development Workflow

1. Create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run tests: `npm run test`
4. Run linting: `npm run lint`
5. Open a pull request

## Running Tests

```bash
npm run test          # unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright) — requires browser install
```

For E2E tests, install browsers once:
```bash
cd apps/web && npx playwright install
```

## Code Style

- TypeScript everywhere — no `any` unless unavoidable
- Tailwind for styling — no inline styles
- React Query for server state, Zustand for UI state
- Zod for all runtime validation

## Submitting a Pull Request

- Keep PRs focused — one feature or fix per PR
- Add tests for new features
- Update the README if you're adding something users need to know about
- Reference any related issues in your PR description

## Reporting Bugs

Open an issue and include:
- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS if it's a UI bug

## Feature Requests

Open an issue describing the use case. Explain what problem it solves before proposing a solution.
