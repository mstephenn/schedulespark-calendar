# Calendar Package Release Process

This runbook prepares `@schedulespark/calendar` for npm publishing.

## Release Gates

Complete these checks before the first publish and before every subsequent beta:

- Package metadata: name, exports, peer dependencies, `files`, license, repository, and `publishConfig`.
- README: install instructions, styling import, core concepts, React usage, interactive usage, recurrence usage, and headless core usage.
- Changelog: a release entry exists for the version being published.
- API review: public exports are reviewed for stability and documented in `docs/public-api-review.md`.
- Security review: dependency and package-content checks are recorded in `docs/security-review.md`.
- CI: package test, typecheck, lint, and build jobs pass.

## Version Approval

Do not change `packages/calendar/package.json` `version` without explicit approval from the maintainer. Version bumps are release decisions, not incidental cleanup.

## Prepublish Commands

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @schedulespark/rrule build
pnpm --filter @schedulespark/calendar test
pnpm --filter @schedulespark/calendar typecheck
pnpm --filter @schedulespark/calendar lint
pnpm --filter @schedulespark/calendar build
pnpm --filter @schedulespark/calendar pack --dry-run
```

Inspect the dry-run package file list. It should include `package.json`, `dist`, `README.md`, `LICENSE`, `CHANGELOG.md`, and package docs.

## Publish Command

After version approval and all release gates pass:

```bash
pnpm --filter @schedulespark/calendar publish --access public
```

If publishing a beta release, use the npm tag agreed for that release.
