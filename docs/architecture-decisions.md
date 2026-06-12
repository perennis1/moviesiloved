# Architecture Decisions

## ADR-001: Authentication Model

We use Clerk as the authentication provider across both the Next.js App Router and the Express API layer.

- Next.js request authentication is enforced through Clerk middleware.
- Express routes derive identity from Clerk's server-side request auth helpers.
- No custom session store is used as the primary identity boundary.
- The backend treats the Clerk `userId` as the authenticated identity boundary.

## ADR-002: Deployment Topology

The application runs as a same-origin Node deployment.

- Express is the primary server.
- Express mounts API routes under `/api`.
- Express hands all non-API requests to the Next.js App Router.
- Next.js runs in server mode. We do not use `next export`.

## ADR-003: Data Model Rules

The Prisma schema is the source of truth for relational structure.

- All tables include `createdAt` and `updatedAt` where records are mutable.
- Canonical movie identity is enforced through `slug` and optional `externalId`.
- Join and edge tables use composite keys or composite unique constraints.
- Every relation declares explicit `onDelete` behavior.

## ADR-004: Media Scope

Version 1 is a metadata-first movie application.

- We do not host, store, or stream video files in v1.
- Movie pages may reference poster, backdrop, and trailer URLs from third-party providers.
- Admin-managed image uploads must use a configured persistent directory or disk mount in production.
- Any future media delivery subsystem is a separate scoped phase.

## ADR-005: Session Operations

Authentication state is delegated to Clerk rather than an application-managed session store.

- Clerk configuration is environment-driven and must be valid in both Next.js and Express contexts.
- Admin access is enforced through the `CLERK_ADMIN_USER_IDS` allow-list.
- Domain user records are synchronized into Prisma only when application features need a local user row.
- Session lifecycle, cookie handling, and token persistence are owned by Clerk, not by the Prisma domain schema.
