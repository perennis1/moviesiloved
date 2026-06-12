# Production Checklist

This repo is intended to ship as a single Render-hosted monolith, with GitHub Actions building the Docker image and pushing it to GHCR.
For the release sequence and branch protection guidance, see [release-and-branch-protection.md](./release-and-branch-protection.md).

## Hosting Layout

- Frontend: Render web service
- Backend: same Render web service, via the custom Express server
- Database: Neon Postgres
- Auth: Clerk
- Error logging: Sentry
- Media storage: S3-compatible bucket such as AWS S3 or Cloudflare R2

## Required Runtime Variables

### Core app

- `DATABASE_URL`
- `PORT`
- `APP_URL`

### Clerk

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_SIGN_IN_URL`
- `CLERK_SIGN_UP_URL`
- `CLERK_ADMIN_USER_IDS`

### Media storage

- `MEDIA_STORAGE_BUCKET`
- `MEDIA_STORAGE_REGION`
- `MEDIA_STORAGE_ENDPOINT`
- `MEDIA_STORAGE_ACCESS_KEY_ID`
- `MEDIA_STORAGE_SECRET_ACCESS_KEY`
- `MEDIA_PUBLIC_BASE_URL`
- `MEDIA_STORAGE_PREFIX`

### Sentry runtime

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ENVIRONMENT`

### Sentry build and release upload

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_RELEASE`

## Recommended Render Settings

- Use the Docker image built by GitHub Actions or let Render build from `Dockerfile`.
- Set the health check path to `/api/health`.
- Use persistent bucket storage for all uploaded media.
- Keep `APP_URL` pointed at the public Render domain.

## Recommended GitHub Settings

- Protect `main` with required PR reviews and required CI checks.
- Use the `Release` workflow only for version tags like `v0.1.1`.
- Keep tag releases separate from merge deploys so Render auto-deploys stay simple.

## Media Rules

- Do not store screenshots, actor profiles, or the site logo on local disk in production.
- Use the bucket URL returned by the upload endpoint and persist only that URL in the database.
- If the bucket is missing in production, fail fast instead of silently falling back to local disk.

## Verification

- `npm run build`
- Container boot test
- Health check test against `/api/health`
- Upload test for logo, profile image, and screenshot
- Sentry test error from browser and server paths
