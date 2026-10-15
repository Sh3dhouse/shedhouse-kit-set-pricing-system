# SH shared quote storage

The deployed application uses a Sites-provisioned Cloudflare D1 database (`DB`). The site access policy is the team boundary. APIs additionally require dispatch-authenticated ChatGPT identity. There is no anonymous shared quote access, client-supplied editor identity, public write endpoint or database credential in browser code.

## Data model

- `quotes`: unique ID, immutable workflow, normalized quote document, revision, creation/update timestamps, editor identity and archive timestamp.
- `quote_history`: retained document snapshot and authenticated editor for every successful save, archive and restore. The UI shows the most recent 100 events.
- Workflow values remain `KIT_ONLY` and `KIT_PLUS_WORK`. Both share the same schema and pricing engine. Every list/get/update endpoint requires a workflow; a quote ID cannot be moved between workflows.

All data remains within the same Site database when additional authorised team members join. These records are shared team records, not filtered by creator. Site membership is managed through Sites access settings, never by a browser-supplied role.

## API contract

- `GET /api/session`: signed-in display email and shared-storage availability.
- `GET /api/quotes?variant=KIT_ONLY`: active records, 100 per page with an opaque `nextCursor`. `archived=1` lists archived records. The browser follows every page.
- `GET /api/quotes/:id?variant=...`: latest shared document and metadata.
- `POST /api/quotes`: `{ quote, expectedRevision }`; use 0 only for a new ID. The server normalizes input and calculates no trusted totals from client caches.
- `PATCH /api/quotes/:id`: `{ variant, expectedRevision, restore }`; false archives, true restores.
- `GET /api/quotes/:id/history?variant=...`: recent revision metadata.

`_revision`, `_updatedBy`, `_createdAt` and `_archived` are response metadata; editor identity and timestamps are always set by the server. Mutation requests require same-origin JSON. Database writes use bound parameters and an atomic D1 batch for the revision-guarded mutation plus its history entry. A stale revision returns HTTP 409; it never overwrites a newer version.

## Drafts and migration

Unsaved drafts remain device-local. **Save to team** creates or updates the shared record. Refreshing the shared library and returning to the browser reloads shared records without replacing unsaved drafts.

Existing browser-only saved quotes are retained as device-only records. On Saved quotes, **Copy device-only quotes to shared storage** transfers them individually. Each local record is removed from the migration list only after a confirmed server save. Duplicated IDs are reported as conflicts rather than overwritten. Existing localStorage data is never seeded into the production database from the source repository.

For an edit conflict, download a backup if needed, then reload the latest shared version or keep the current draft as a new quote. Archive is reversible through the Archived quotes view; there is no permanent-delete UI.

## SHP integration

The pricing engine remains independent of storage. SHP export schema `1.0` and the two workflow discriminators are unchanged. Database revision metadata does not change customer pricing. `public/pricing.js` and `server/quotes.mjs` can be adapted behind SHP's authentication and persistence layer later. Do not merge the two workflow namespaces during import.

## Development

Use Node 22.13 or later. Install dependencies with the Sites installer. `npm test` runs pricing and SQLite-backed shared repository tests. `npm run db:generate` creates append-only Drizzle SQL migrations; do not modify migrations already applied in production.

Run a build, apply pending SQL to local D1 using the generated `dist/server/wrangler.json`, then `npm run dev` for local preview. Portable local authentication uses the starter's loopback-only `/signin-with-chatgpt?return_to=/` simulation. This simulation is excluded from production. Hosted authentication remains dispatch-owned.
