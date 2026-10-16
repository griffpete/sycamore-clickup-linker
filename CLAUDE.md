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

- The card's "Can't find it? Create a bug" form takes a bug name, the issue, the expected behavior and the steps to replicate. The school, reporter and ticket URL come from the ticket.
- `GET /api/tickets/:ticketId/bug-context` prefills the bug name from the ticket subject and tells the card which school it will file under. The service reads the school from `hs_primary_company_name`, falling back to `freshdesk_company`, and the reporter from `hs_all_associated_contact_emails`, falling back to `freshdesk_requester_email`. No company scope is needed.
- `POST /api/bugs` creates the task, adds it to the cache, and returns it. The card then links it to the ticket.
- The description follows the "Bug Report" template task (86bc3da0k): "Describe the issue", "Expected Behavior" and "Steps to Replicate" from the form, then "Reporting Schools" with school, reporter, and the HubSpot ticket URL. Empty sections keep the template's italic helper text. It is sent as `markdown_description` so the headings render.
- New bugs are tagged `bug` (`CLICKUP_BUG_TAGS`, comma separated). The tag must already exist in the target space.
- Three custom fields are set: Ticket URL, Reporting Schools (school, reporter, ticket URL) and Note (which agent filed it). `src/bugTemplate.js` holds their IDs. Assigned Comment Assignee, GitHub PR and Days Stale are left to ClickUp. Which fields appear on a task is a list setting, not something the API controls. The team leaves Notes, Summary, Feedback Type, User Type, and Ticket # empty, so the card does too. GitHub PR and Days stale are filled in ClickUp.

## Gotchas

- Keep `uid` in `app-hsmeta.json` as `clickup_bug_linker` and `name` in `hsproject.json` as `clickup-bug-linker`, or HubSpot creates a new app or project.
- Legacy `tickets` scope is rejected. Use `crm.objects.tickets.*` and `crm.schemas.tickets.*` plus `oauth`.
- `HUBSPOT_ACCESS_TOKEN` is the static token from the app's Distribution tab, not the Auth tab.
- `PUBLIC_BASE_URL` must exactly match the URL HubSpot calls or signature checks fail.
- `hubspot.fetch` only reaches URLs in `permittedUrls.fetch`, never localhost. Changes need `hs project upload`.
- A card has exactly one `location`. Changing it removes the card from its old place. Two cards share `BugLinkCard.jsx`: `clickup_bug_link_card` at `helpdesk.sidebar` and `clickup_bug_link_record_card` at `crm.record.sidebar`. A third card, `clickup_company_bugs_card` (`CompanyBugsCard.jsx`), sits at `crm.record.tab` on companies.
- UI extension `Input` and `SearchInput` fire `onChange` on blur. Use `onInput` with `useDebounce` for live search.
- ClickUp has no text search endpoint, so search runs against the in-memory cache.
- ClickUp statuses come back lowercase. Status `type` of `closed` or `done` means closed.
- ClickUp token goes raw in the Authorization header, no `Bearer`.
- `.env` changes need a service restart. `npm run dev` only watches source files.
- This folder lives on the iCloud-synced Desktop. After `npm install`, iCloud touches every file in `node_modules` for a while. Node's `--env-file` flag makes watch mode watch the whole `service/` folder, so it restarts in a loop. That is why `config.js` loads `.env` itself and `npm run dev` uses `--watch-path=src` with no `--env-file`.
- Each restart reloads the bug list (about 6 ClickUp requests). Restart loops burn through the 100 requests per minute limit.
- `hs project upload --force-create` is deprecated and fails to find the project. Use `hs project upload` or `--force`.

## Three paths on the card (added 2026-10-08, from Kimberly's thread on ClickUp 86bc3b9my)

The card opens with a radio choice: no bug needed (default), add this ticket to an existing bug, or create a new bug. Most tickets need no bug; that is agent discretion.

- **Add to an existing bug** requires a report ("What did the school report?"). `PUT /api/tickets/:id/linked-bug` with `{bugId, details}` posts a comment on the ClickUp task (`src/bugReport.js`: school, reporter, ticket URL, filing agent, then the text) and then links. A PUT without `details` is rejected unless `justCreated: true`, which the create path sends right after `POST /api/bugs`.
- **Create a new bug** adds a priority select (urgent/high/normal/low → ClickUp 1–4) and a tag multi-select. Tag options are the tags of the current bug space minus the automatic `bug` tag (`CLICKUP_BUG_TAGS`), loaded live, so Kimberly adds tags in ClickUp and they appear on the next cache refresh (5 min). Unknown tags sent by a client are dropped server-side.

## Quarter lists

`src/bugLists.js` finds every ClickUp space whose name starts like `2026 Q4 Bugs` (regex `^\d{4}\s*Q[1-4]\b.*bugs`, case-insensitive), picks the newest quarter, and inside it the list named like "bug" or else the first list. New bugs go there; searches cover every quarter list plus `CLICKUP_SEARCH_LIST_IDS` (the legacy 500-bug list, 162901508). Kimberly switches quarters by creating a new space named e.g. `2027 Q1 Bugs (Suspected)` with the bug template list and the tags she wants; nothing else changes. `CLICKUP_CREATE_LIST_ID` is now an optional override and should be removed from Render so the auto-switch works. Tags are per space, so the 15 tags created on 2026-10-08 in the Q4 space need recreating in each new quarter space (or copy the space).

## Company bugs card (added 2026-10-16, ClickUp 86bckpp1c)

Karla wanted every bug for a school in one place. Bugs still live only in ClickUp, so the company view is built from the company's tickets.

- `GET /api/companies/:companyId/bugs?portalId=` (`src/companyBugs.js`): searches tickets with `associations.company = id` and a `clickup_bug_id`, groups them by bug id (one row per bug, however many tickets point at it), and refreshes name, URL, status and open/closed from ClickUp through `getCurrentBug` (cache first, then the task by id). Completed bugs are included with their status. Open bugs sort first, then by last link date. The ticket search filter on `associations.company` works with ticket scopes alone, but HubSpot refuses to build a card whose `objectTypes` includes companies unless the app has `crm.objects.companies.read`, so that scope was added to `app-hsmeta.json` (build #21 failed without it). Re-approve scopes after upload at `https://app-na2.hubspot.com/static-token/243811447/authorize?appId=53432960`; the static token stays the same.
- `CompanyBugsCard.jsx`, location `crm.record.tab`, objectTypes `companies`: table of bug (link to ClickUp), status tag, the company's tickets on that bug (links), last linked date; "Show completed" toggle (default on), Refresh button, empty state when the company has no linked bugs.
- After `hs project upload` and the Render deploy, add the card to the company record's default view (Settings > Objects > Companies > Record customization > Default view > middle column, or the layout editor URL in the Sycamore memory notes).
- Historical ClickUp bugs rarely carry a school. 31 of 603 have a Freshdesk ticket URL; after the Freshdesk migration those can be backfilled onto the migrated tickets (`freshdesk_ticket_id`) to seed the view. Not done yet.
