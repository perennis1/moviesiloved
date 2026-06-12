# Product Upgrade Roadmap

This document captures the next layer of improvements for the admin dashboard and the sitewide product surface. The app is functionally solid now, but the dashboard still needs deeper operational tooling and the public site still needs stronger discovery, governance, and reporting.

The five focus areas below are ordered by product leverage:

1. Admin audit log and role model
2. Analytics reporting
3. Media management
4. Sitewide settings
5. Public discovery and SEO

## Guiding Principles

- Do not add features that only look complete in the UI.
- Every new control must map to a real backend behavior.
- Every admin write action must be authenticated, auditable, and safe to retry.
- Public-facing upgrades should improve search, discoverability, and trust without adding dead ends.
- When a surface is not ready, hide it or clearly label its scope.

---

## 1. Admin Audit Log and Role Model

### Current State

- Admin access is still based on a Clerk allow-list in `CLERK_ADMIN_USER_IDS`.
- The dashboard has content, media, monetization, analytics, and settings modules, but no first-class audit trail.
- There is no editor/moderator role model yet.
- There is no user-facing moderation workflow beyond reviews/comments.

### Why This Matters

- The more people touch the dashboard, the more important traceability becomes.
- Without audit history, it is hard to answer who changed a setting, archived a movie, or updated monetization markup.
- A real role model reduces the need to hand out full admin access for small tasks.

### Required Upgrades

- Add an explicit role system for administrative users.
- Keep Clerk as the identity provider, but store app-level permissions in the database.
- Introduce roles such as `ADMIN`, `EDITOR`, and `MODERATOR`.
- Add an audit log table for content changes, settings updates, login actions, and moderation actions.
- Record who performed the action, what changed, when it changed, and what object was affected.
- Add moderation tools for reviews/comments if those remain user-visible in v1.

### Suggested Backend Shape

- `AdminRole` or `UserRole` table keyed by Clerk `userId`.
- `AuditLog` table with:
  - actor user id
  - action type
  - entity type
  - entity id
  - before/after snapshots or a compact diff
  - createdAt
- Server helpers for:
  - `requireAdmin`
  - `requireEditor`
  - `requireModerator`

### Suggested UI Shape

- A dashboard panel for recent activity.
- A per-movie history panel showing edits and status changes.
- A settings history panel for global configuration changes.
- A user moderation panel if user review moderation becomes part of v1.

### Acceptance Criteria

- Every important admin mutation creates an audit entry.
- Audit entries can be filtered by actor, entity, and action type.
- Non-admin users cannot access admin surfaces.
- Lower-privilege admin users only see the controls allowed by their role.

### Priority

- `P0` if more than one admin will touch the dashboard before launch.
- `P1` if the app remains single-admin for now but needs traceability soon.

---

## 2. Analytics Reporting

### Current State

- The app tracks views and outbound clicks.
- `DailyMetric` exists in the Prisma schema.
- The dashboard shows total views, total clicks, and a simple conversion ratio.
- Reporting is still mostly aggregate-based.

### Why This Matters

- Total counts are useful, but they do not tell you what changed today or where the funnel is failing.
- The business needs to know which titles drive traffic, which titles convert, and whether the verify flow is working.
- Analytics should support editorial and monetization decisions, not just display numbers.

### Required Upgrades

- Add date-range filters for analytics views.
- Add daily/weekly/monthly trend charts.
- Separate unique views from total views if needed.
- Separate verify starts, verify completions, and outbound destination clicks.
- Add top content by:
  - views
  - clicks
  - conversion rate
  - recent growth
- Add a per-title analytics view on the movie detail admin panel.

### Suggested Metrics

- Views
- Unique views
- Verify starts
- Verify completions
- Outbound clicks
- Click-through rate
- Conversion rate
- Top pages by day
- Top pages by week

### Suggested Backend Shape

- Continue using `DailyMetric` for the first pass.
- Add read endpoints that accept:
  - `from`
  - `to`
  - `granularity`
  - `movieId`
- If reporting needs grow, introduce a small analytics summary table instead of overloading the daily row.

### Suggested UI Shape

- Analytics dashboard cards for:
  - today
  - last 7 days
  - last 30 days
- Line chart for views and clicks over time.
- Table for top titles.
- Filter chips for time range.
- Detail drawer or panel for a selected title.

### Acceptance Criteria

- Dashboard analytics can answer “what happened this week?”
- Analytics numbers are deduplicated and explainable.
- Per-title metrics are available from the admin dashboard.
- The same metric definitions are used in the public site and admin UI.

### Priority

- `P1` for the dashboard.
- `P0` if monetization depends on trustable reporting before launch.

---

## 3. Media Management

### Current State

- The admin has a logo uploader.
- Movie posters and backdrops are still primarily URL-based fields in the content form.
- The dashboard shows poster coverage, but not a real asset library.
- There is no bulk asset replacement workflow.

### Why This Matters

- As the catalog grows, URL-only media management becomes hard to maintain.
- Editors need one place to see missing posters, broken images, and duplicated assets.
- Media is a production workflow, not just a form field.

### Required Upgrades

- Create a dedicated media manager module.
- Support browsing uploaded and referenced assets.
- Support replacing poster, backdrop, and screenshot assets.
- Add bulk update actions for common media fixes.
- Add image validation for type, size, and dimensions where needed.
- Add clear fallback states for missing media on public pages.

### Suggested Backend Shape

- A media table or asset index if the app starts storing uploaded files centrally.
- Metadata for:
  - file name
  - file type
  - size
  - usage count
  - upload source
  - createdAt
- Keep the current persistent upload path model if that remains the deployment strategy.

### Suggested UI Shape

- Asset grid with poster previews.
- Missing asset queue.
- Replace and unlink actions.
- Upload status and validation feedback.
- Asset usage references, especially for posters and logos.

### Acceptance Criteria

- Editors can see all media-related gaps from one place.
- Replacing media does not require manual DB edits.
- Missing assets are surfaced in the dashboard before they become public-facing problems.
- Public pages degrade gracefully when media is absent.

### Priority

- `P1` for any catalog that updates regularly.
- `P2` only if all media remains small and manually maintained for a long time.

---

## 4. Sitewide Settings

### Current State

- Global settings already cover announcement text, logo, and ad snippets.
- Settings are editable in the dashboard and persist in Prisma.
- The current settings surface is functional but narrow.

### Why This Matters

- Sitewide settings are where product and operations meet.
- A growing site needs more than just an announcement bar and logo.
- The settings panel should be the central place to control how the site behaves without code changes.

### Required Upgrades

- Add SEO defaults:
  - site title
  - meta description
  - social sharing image
  - canonical domain
- Add homepage controls:
  - featured section enable/disable
  - section ordering
  - category display rules
- Add operational toggles:
  - maintenance mode
  - review submissions on/off
  - public search on/off if needed
  - ads on/off per placement
- Add legal/footer content:
  - terms link
  - privacy link
  - disclaimer text

### Suggested Backend Shape

- Expand `GlobalSettings` usage with grouped keys or structured settings namespaces.
- Validate settings by type:
  - text
  - url
  - boolean
  - JSON
- Keep ad snippet validation separate from general settings validation.

### Suggested UI Shape

- Settings sections for:
  - branding
  - discovery
  - monetization
  - legal
  - operations
- Clear save feedback and validation errors.
- A preview panel for homepage/metadata changes where useful.

### Acceptance Criteria

- Most sitewide changes can be made without redeploying code.
- Settings validation prevents broken site config from being saved.
- Settings are grouped logically enough that a non-technical admin can use them.
- The dashboard exposes only settings that are safe to change in production.

### Priority

- `P1` for branding and ads.
- `P2` for less critical SEO and legal metadata, unless launch requires them.

---

## 5. Public Discovery and SEO

### Current State

- The homepage supports search and featured content.
- Genre/year/language pages exist.
- Movie pages are content-rich and structurally strong.
- The public site still needs better discovery hierarchy, ranking, and metadata discipline.

### Why This Matters

- Public discovery drives traffic, retention, and conversion.
- The better the public pages perform, the less the dashboard needs to compensate with manual curation.
- Search engines and users should see the same product structure.

### Required Upgrades

- Improve homepage ranking:
  - popularity
  - recency
  - featured priority
  - category relevance
- Improve taxonomy pages:
  - better sort controls
  - better empty states
  - clearer category naming
- Improve movie page SEO:
  - canonical tags
  - OG metadata
  - title and description discipline
  - structured data where appropriate
- Add stronger related-content suggestions.
- Make search more useful than plain text matching if catalog size grows.

### Suggested UX Shape

- Clear browse paths from homepage to category pages to movie pages.
- Related titles based on genre, language, and content type.
- Stronger “you may also like” or “more from this genre” sections.
- Better empty and no-result states with next-step navigation.

### Suggested Technical Shape

- Server-side metadata generation for movie and archive pages.
- Search ranking improvements over simple substring filtering.
- Canonical URLs for archive and movie pages.
- Rich social preview handling.
- Optional schema markup for movies/series.

### Acceptance Criteria

- Public pages are easier to navigate without using the admin dashboard.
- Search and filters feel intentional, not decorative.
- Movie pages are shareable and indexable.
- The same content can be reached through browse, search, and related links.

### Priority

- `P1` for ranking and metadata.
- `P2` for advanced recommendation logic.

---

## Recommended Build Order

1. Admin audit log and role model
2. Analytics reporting
3. Media management
4. Sitewide settings
5. Public discovery and SEO

## Risks To Watch

- Avoid creating a “settings” surface that can break the site with one bad save.
- Avoid analytics that look precise but are not deduplicated or explainable.
- Avoid media workflows that still depend on manual DB editing.
- Avoid role systems that add UI complexity without backend enforcement.
- Avoid public discovery changes that improve styling but not actual ranking or navigation.

## Definition Of Success

The dashboard should become the place where the site can be operated safely at scale:

- admins can trace changes
- analytics can support decisions
- media can be maintained systematically
- site behavior can be controlled from one place
- public users can browse and discover content more effectively

That is the point where the app stops feeling like a finished frontend and starts feeling like an actual product platform.
