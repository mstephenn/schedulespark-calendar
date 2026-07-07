# Security and Dependency Review

This document records the security checks required before publishing `@schedulespark/calendar`.

## Current Dependency Model

- Runtime dependency: `@schedulespark/rrule`.
- Peer dependencies: `react`, `react-dom`.
- Development dependencies: Testing Library, TypeScript, Vite, Vitest, and React type packages.

The package does not perform network requests, execute user-provided code, or store secrets.

## Required Checks Before First Publish

Run from the repository root:

```bash
pnpm audit --prod
pnpm --filter @schedulespark/calendar pack --dry-run
```

Review the dry-run package contents for accidental source maps, local environment files, generated secrets, test fixtures with private data, or unrelated monorepo files.

Expected package contents are constrained by `files` in `package.json`:

- `CHANGELOG.md`
- `docs`
- `dist`
- `README.md`
- `LICENSE`

## Manual Review Checklist

- No `.env`, credentials, service tokens, or private URLs in the packed package.
- No bundled app-specific ScheduleSpark business logic in the package.
- No new runtime dependency without a license and maintenance review.
- Peer dependency ranges match the supported React major version.
- Package source avoids `dangerouslySetInnerHTML` and does not inject untrusted HTML.

## First Publish Decision

For this SCH-45 readiness pass:

- `pnpm audit --prod` reported no known vulnerabilities.
- `pnpm --filter @schedulespark/calendar pack --dry-run` included only the expected package metadata, `dist`, README, license, changelog, and package docs.

The `Security Review Required` Linear label can be cleared after the maintainer confirms the exact release commit and version.
