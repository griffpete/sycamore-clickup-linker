# ClickUp Bug Linker for HubSpot Help Desk

Support agents working a ticket in the HubSpot help desk find the ClickUp bug behind the ticket and link it with one click.

- Bugs live in one ClickUp list: Product > Feedback & Ideas > Bugs (Suspected).
- Bugs are not copied into HubSpot. The card searches ClickUp through our service.
- The selection is recorded on the HubSpot ticket as properties in the "ClickUp" group.
- One bug per ticket. Linking a new bug replaces the old one.
- Bugs with the "complete" status (ClickUp type `closed`) are never loaded or offered. A ticket already linked to a bug that later becomes complete still shows its current status, fetched from ClickUp by task ID.

## Code style

- No comments in code.
- Keep code straightforward and readable.

## Architecture

```
Help desk sidebar card (React, HubSpot UI extension, hubspot/src/app/cards)
  -> hubspot.fetch() through HubSpot's proxy, signed with X-HubSpot-Signature-v3
  -> Node/Express service (service/, currently local + ngrok, Render later)
       -> ClickUp API: loads the bug list into an in-memory cache (5 min stale-while-revalidate)
       -> HubSpot CRM API: reads and writes link properties on the ticket
```

## Accounts

- HubSpot portal: sycamore-leaf-solutions (243811447), Professional tier. No custom objects, no serverless functions.
- ClickUp workspace: Sycamore.
- Public URL while developing: https://detached-worsening-happily.ngrok-free.dev

## Commands

From `service/`: `npm run dev`, `npm run find-list -- "Bugs (Suspected)"`, `npm run setup:hubspot`, `npm run cleanup:dry-run`, `npm run cleanup`.

From `hubspot/`: `hs project install-deps`, `hs project upload`, `hs project open`.

ngrok: `ngrok http 3000 --url=detached-worsening-happily.ngrok-free.dev`

## Creating bugs from the card

- The card has a "Can't find it? Create a bug" form with a name and details field.
- `POST /api/bugs` creates the task in the ClickUp bug list, adds it to the cache, and returns it. The card then links it to the ticket.
- The task description gets a link back to the HubSpot ticket and the agent's email.

## Gotchas

- Keep `uid` in `app-hsmeta.json` as `clickup_bug_linker` and `name` in `hsproject.json` as `clickup-bug-linker`, or HubSpot creates a new app or project.
- Legacy `tickets` scope is rejected. Use `crm.objects.tickets.*` and `crm.schemas.tickets.*` plus `oauth`.
- `HUBSPOT_ACCESS_TOKEN` is the static token from the app's Distribution tab, not the Auth tab.
- `PUBLIC_BASE_URL` must exactly match the URL HubSpot calls or signature checks fail.
- `hubspot.fetch` only reaches URLs in `permittedUrls.fetch`, never localhost. Changes need `hs project upload`.
- A card has exactly one `location`. Changing it removes the card from its old place.
- UI extension `Input` and `SearchInput` fire `onChange` on blur. Use `onInput` with `useDebounce` for live search.
- ClickUp has no text search endpoint, so search runs against the in-memory cache.
- ClickUp statuses come back lowercase. Status `type` of `closed` or `done` means closed.
- ClickUp token goes raw in the Authorization header, no `Bearer`.
- `.env` changes need a service restart. `npm run dev` only watches source files.
- This folder lives on the iCloud-synced Desktop. After `npm install`, iCloud touches every file in `node_modules` for a while. Node's `--env-file` flag makes watch mode watch the whole `service/` folder, so it restarts in a loop. That is why `config.js` loads `.env` itself and `npm run dev` uses `--watch-path=src` with no `--env-file`.
- Each restart reloads the bug list (about 6 ClickUp requests). Restart loops burn through the 100 requests per minute limit.
- `hs project upload --force-create` is deprecated and fails to find the project. Use `hs project upload` or `--force`.
