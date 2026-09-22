# ClickUp ↔ HubSpot bug linker

Links HubSpot support tickets to ClickUp bugs from a card on the ticket record.

This repo currently contains **Phase 0**: a connection check that proves the three risky pieces work before anything real is built.

1. An app card installs and renders on a ticket in the client's HubSpot portal (non-Enterprise).
2. The card can reach our sync service through `hubspot.fetch()`, and the service can verify HubSpot's request signature.
3. The service can read HubSpot tickets and talk to the ClickUp API.

## Layout

```
hubspot/    HubSpot developer project (app + ticket card)
service/    Node sync service (Express)
```

## Before you start

- **ClickUp token:** create it from a dedicated ClickUp user (for example `hubspot-integration@...`) rather than someone's personal account. A personal token has full access to everything that person can see, and it breaks when they leave.
- **Hosting:** the service needs a public HTTPS URL. Any host works (Render, Railway, Fly, Cloud Run, a VPS). Localhost can't be used in `permittedUrls`.
- **Bugs in ClickUp:** confirm which Space or List holds bugs, and what statuses and custom fields they use. Phase 1 depends on this.

## Phase 0 setup

### 1. Upload the HubSpot project

```bash
npm install -g @hubspot/cli
hs account auth
cd hubspot
hs project install-deps
hs project upload
```

Authenticate against the client's production portal, since the point of this test is to confirm the card works on their subscription tier.

### 2. Install the app and copy credentials

1. Run `hs project open`, click the app, open the **Distribution** tab, and click **Install now**.
2. In the app's settings, copy the **static access token** and the **client secret**.

### 3. Deploy the service

```bash
cd service
cp .env.example .env
npm install
npm run dev
```

Set these environment variables on your host:

| Variable | Value |
| --- | --- |
| `PUBLIC_BASE_URL` | The service's public HTTPS URL, with no trailing slash |
| `HUBSPOT_CLIENT_SECRET` | The app's client secret |
| `HUBSPOT_ACCESS_TOKEN` | The app's static access token |
| `CLICKUP_API_TOKEN` | The integration user's ClickUp token |

Check `GET /health` returns `{ "ok": true }`.

### 4. Point the card at the service

Replace `https://your-service.example.com` with the real URL in both places:

- `hubspot/src/app/app-hsmeta.json` under `permittedUrls.fetch`
- `hubspot/src/app/cards/BugLinkCard.jsx` in `SERVICE_URL`

Then run `hs project upload` again.

### 5. Add the card to the ticket record

1. Go to **CRM > Tickets** and open any test ticket.
2. Click **Customize** at the top of the middle column, then **Default view**.
3. In the right sidebar, open **Card library**, filter **Card types** to **App**, and add **ClickUp bugs**.

## Reading the result

| What you see | What it means | Next step |
| --- | --- | --- |
| Two green alerts | Everything works | Start Phase 1 |
| Card won't install or doesn't appear in the card library | Likely a subscription limit on static-auth app cards | Switch `auth.type` to `oauth` (private distribution) and add an install flow to the service |
| "Can't reach the sync service" | URL mismatch or service down | Check `permittedUrls`, `SERVICE_URL`, and **Development > Monitoring > Logs > UI Extensions** |
| 401 "Invalid HubSpot signature" | `PUBLIC_BASE_URL` doesn't exactly match the URL HubSpot called, or wrong client secret | Compare the URL in the UI extension logs with `PUBLIC_BASE_URL` |
| Red HubSpot or ClickUp alert | Token or scope problem on that side | The error message includes the status code |

To separate code problems from subscription problems, you can also upload the same project to a free developer test account.

## Phase 1: Link a ClickUp bug from the help desk

Agents open a ticket in the help desk workspace, search the ClickUp list **Product > Feedback & Ideas > Bugs (Suspected)** from the **ClickUp bug** card in the right sidebar, and pick one. The selection is saved on the HubSpot ticket in these properties:

| Property | Contents |
| --- | --- |
| `clickup_bug_id` | ClickUp task ID |
| `clickup_bug_name` | Bug name |
| `clickup_bug_url` | Link to the bug |
| `clickup_bug_status` | Bug status when linked |
| `clickup_bug_linked_at` | When it was linked |
| `clickup_bug_linked_by` | Email of the agent who linked it |

Bugs are not copied into HubSpot. The service loads the list from ClickUp, keeps it in memory, and refreshes it in the background every 5 minutes. The card's **Refresh from ClickUp** button forces an immediate reload.

### Setup

1. Find the list ID with `npm run find-list -- "Bugs (Suspected)"`, or copy the number after `/li/` from the list's URL in ClickUp.
2. Add `CLICKUP_BUG_LIST_ID` to `service/.env`.
3. If you ran the earlier bug-pipeline backfill, remove it:

   ```bash
   npm run cleanup:dry-run
   npm run cleanup
   ```

4. Create the link properties with `npm run setup:hubspot`.
5. Restart the service with `npm run dev`.
6. From the `hubspot` folder, run `hs project upload`.
7. Add the card to the help desk sidebar: **Settings > Inbox & Help Desk > Help Desk > Sidebar customization**, open **Default view**, click **Add card**, choose **ClickUp bug**, then **Save and exit**. This needs Super Admin permissions and Service Hub Professional or Enterprise.

### API

All `/api` routes require a valid HubSpot request signature.

| Route | Purpose |
| --- | --- |
| `GET /api/bugs?query=&status=open` | Search bugs. `status` is `open`, `all`, or a ClickUp status name. Returns up to 25, most recently updated first |
| `GET /api/tickets/:ticketId/linked-bug` | The ticket's linked bug, with its current ClickUp status |
| `PUT /api/tickets/:ticketId/linked-bug` | Link a bug. Body: `{ "bugId": "..." }` |
| `DELETE /api/tickets/:ticketId/linked-bug` | Remove the link |

## Roadmap

**Next**
- Deploy the service to Render
- Write the link back to ClickUp (a comment or custom field with the HubSpot ticket link)
- Saved help desk views, such as open tickets with no linked bug

**Later**
- AI suggestions for the most likely bug on each ticket
- Link many tickets to one bug at once
