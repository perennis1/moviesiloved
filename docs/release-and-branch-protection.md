# Release And Branch Protection

This repo already ships from `main` through Render auto-deploy, and the CI workflow builds and pushes the Docker image to GHCR on every `main` push.

## Shipping Flow

1. Merge changes into `main` through a pull request.
2. Let Render auto-deploy the `main` branch update.
3. Verify `/api/health` returns `200`.
4. Create a version tag like `v0.1.1` when you want a named release artifact.
5. Push the tag to trigger the release workflow and create the GitHub Release plus the versioned GHCR image.

## Recommended Branch Protection For `main`

Configure these settings in GitHub repository settings:

- Require a pull request before merging
- Require at least 1 approving review
- Require status checks to pass before merging
- Require the `CI / verify` check
- Require conversation resolution before merging
- Block force pushes
- Block branch deletion

## Why This Matters

- Render stays on a clean Git-backed deploy path.
- CI remains the source of truth for build health.
- Tag-based releases give you a stable artifact without coupling releases to every merge.

## Manual Verification

- Confirm the latest Render deploy is live.
- Hit `GET /api/health`.
- Check recent GitHub Actions runs for `CI` and `Release`.
- Check GHCR for the versioned image tag.
