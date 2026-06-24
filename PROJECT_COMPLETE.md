# KoeGaIru Project Completion Record

This document records the project as complete for the committed baseline before the current uncommitted implementation work.

- Baseline branch: `bonus-feature`
- Baseline commit: `9374173 feat: added initial whole projects section page`
- Scope rule: modified and untracked files currently in the worktree are not counted as part of this completion record.

## Project Summary

KoeGaIru is a Next.js App Router application for generating AI voice audio from text, managing reusable voices, organizing work by organization, tracking billing usage, and grouping voice work into projects.

The completed baseline includes the authenticated dashboard experience, text-to-speech generation flow, custom voice creation flow, generated audio retrieval, project creation/list/detail routing, organization enforcement, billing checkout/portal integration, and persistence through PostgreSQL, Prisma, and Cloudflare R2.

## Completed Scope

- [x] Next.js App Router application structure with route groups for the authenticated dashboard.
- [x] Clerk authentication with protected app routes, public sign-in/sign-up routes, and organization selection enforcement.
- [x] Global app providers for Clerk, tRPC React Query, Nuqs query-state handling, and toast notifications.
- [x] Dashboard shell with sidebar state persisted through the `sidebar_state` cookie.
- [x] Dashboard home page with header, hero pattern, text input panel, and quick actions.
- [x] Text-to-speech page with voice selection, prompt input, generation controls, settings, and history UI.
- [x] Text-to-speech generation API flow through the Chatterbox client.
- [x] Generated audio persistence in Cloudflare R2 and database metadata persistence in Prisma.
- [x] Generated audio detail route and protected audio streaming route.
- [x] Voice library with organization-scoped custom voices and shared system voices.
- [x] Custom voice creation through upload or recording, including metadata fields for category, language, and description.
- [x] Voice upload validation for audio content, maximum file size, and minimum duration.
- [x] Voice audio storage in Cloudflare R2.
- [x] Custom voice deletion with related R2 object cleanup.
- [x] Projects section with create, list, and detail routes.
- [x] Project persistence with organization scoping.
- [x] Billing checkout, customer portal, subscription status lookup, and estimated usage display through Polar.
- [x] Sentry instrumentation files included for app monitoring.
- [x] Prisma migrations for the initial schema and project models.

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard home page |
| `/text-to-speech` | Text-to-speech generation workspace |
| `/text-to-speech/[generationId]` | Generated audio detail view |
| `/voices` | Custom and built-in voice library |
| `/projects` | Organization project list and project creation entry point |
| `/projects/[projectId]` | Project detail view |
| `/org-selection` | Clerk organization picker |
| `/sign-in` | Clerk sign-in page |
| `/sign-up` | Clerk sign-up page |
| `/api/trpc/[trpc]` | tRPC API endpoint |
| `/api/audio/[generationId]` | Protected generated-audio streaming route |
| `/api/voices/create` | Custom voice creation route |
| `/api/voices/[voiceId]` | Voice asset route |

## Data Model

The committed Prisma schema defines:

- `Voice`: system and custom voices, with optional organization ownership and R2 object keys.
- `Generation`: generated speech records tied to organization, selected voice, text, settings, and R2 audio.
- `Project`: organization-owned project containers.
- `ProjectBlock`: ordered project blocks that can reference text, voices, and generated audio.
- `VoiceVariant`: separates `SYSTEM` and `CUSTOM` voices.
- `VoiceCategory`: categorizes voice use cases such as audiobook, conversational, customer service, characters, meditation, podcast, advertising, voiceover, and corporate.

## Backend And Integrations

- Clerk handles user authentication and organization context.
- tRPC exposes the `voices`, `generations`, `billing`, and `projects` routers.
- Prisma stores voices, generations, projects, and project blocks in PostgreSQL.
- Cloudflare R2 stores uploaded voice samples and generated audio files.
- Chatterbox handles speech generation through the configured API URL and key.
- Polar handles checkout, customer portal sessions, and subscription status checks.
- Sentry files are present for runtime instrumentation.

## Required Runtime Configuration

The committed environment schema requires these server-side values:

- `POLAR_ACCESS_TOKEN`
- `POLAR_SERVER`
- `POLAR_PRODUCT_ID`
- `DATABASE_URL`
- `APP_URL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `CHATTERBOX_API_URL`
- `CHATTERBOX_API_KEY`

The app also uses Clerk public and secret keys for authentication. The committed `.env.example` lists the Clerk and database variables, but the deployment environment should also include the Polar, R2, and Chatterbox values required by `src/lib/env.ts`.

## Completion Checklist

- [x] Authenticated users can reach the dashboard after selecting an organization.
- [x] Users without an organization are redirected to organization selection.
- [x] Voices can be fetched by organization context and separated into custom and system groups.
- [x] Custom voices can be created from uploaded or recorded audio.
- [x] Uploaded voice audio is validated before storage.
- [x] Text can be submitted for generation with voice and sampling settings.
- [x] Generated audio is saved to R2 and linked back to a database record.
- [x] Generated audio can be opened through a protected detail route.
- [x] Projects can be created, listed, and opened by ID.
- [x] Billing checkout and portal actions are wired through Polar.
- [x] Usage state can be shown in the dashboard sidebar billing container.

## Excluded From This Record

This record intentionally excludes the current uncommitted worktree changes. That includes any behavior or UI only present in modified files after commit `9374173`, plus the current untracked additions:

- `koegairu-dark-mode-preview.png`
- `src/components/theme-provider.tsx`
- `src/features/projects/components/project-card.tsx`
- `src/features/projects/components/projects-list.tsx`
- `src/features/projects/data/`

Those files may become part of a later completion record after they are reviewed, validated, and committed.

## Handoff Notes

- The baseline project is complete for the committed app scope described above.
- Before deployment, make sure the runtime environment contains every value required by `src/lib/env.ts`.
- If subscription enforcement and Polar usage metering are required for launch policy, review the commented billing checks in the voice creation and generation flows before calling the billing policy final.
- Recommended final verification for this baseline is `npm run lint`, `npm run build`, and a signed-in browser pass through dashboard, voices, text-to-speech, projects, and billing.
