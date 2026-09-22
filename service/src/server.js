import express from "express";
import { config } from "./config.js";
import { HttpError } from "./httpError.js";
import { verifyHubSpotRequest } from "./verifyHubSpotRequest.js";
import { findBug, getBugData, getCurrentBug } from "./bugCache.js";
import { createBug } from "./bugCreate.js";
import { searchBugs } from "./bugSearch.js";
import { getLinkedBug, linkBug, unlinkBug } from "./ticketLink.js";

const DEFAULT_SEARCH_LIMIT = 25;
const MAX_SEARCH_LIMIT = 100;

const app = express();

app.use(
  express.json({
    verify: (req, res, buffer) => {
      req.rawBody = buffer.toString("utf8");
    }
  })
);

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    publicBaseUrl: config.publicBaseUrl,
    hasClientSecret: Boolean(config.hubspotClientSecret),
    clientSecretLength: config.hubspotClientSecret.length,
    hasAccessToken: Boolean(config.hubspotAccessToken),
    bugListId: config.clickupBugListId
  });
});

app.use("/api", verifyHubSpotRequest);

app.get("/api/bugs", async (req, res) => {
  const data = await getBugData({ forceRefresh: req.query.refresh === "true" });
  const { total, bugs } = searchBugs(data.bugs, {
    query: req.query.query ?? "",
    status: req.query.status ?? "open",
    limit: Math.min(Number(req.query.limit) || DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT)
  });

  res.json({
    listName: data.listName,
    statuses: data.statuses,
    loadedAt: data.loadedAt,
    total,
    bugs
  });
});

app.post("/api/bugs", async (req, res) => {
  const bug = await createBug({
    name: req.body?.name,
    description: req.body?.description,
    ticketId: req.body?.ticketId,
    portalId: req.query.portalId,
    userEmail: req.query.userEmail
  });

  res.status(201).json({ bug });
});

app.get("/api/tickets/:ticketId/linked-bug", async (req, res) => {
  const linkedBug = await getLinkedBug(req.params.ticketId);

  if (!linkedBug) {
    return res.json({ linkedBug: null });
  }

  const currentBug = await getCurrentBug(linkedBug.id).catch(() => null);

  res.json({
    linkedBug: {
      ...linkedBug,
      currentStatus: currentBug?.status ?? linkedBug.status,
      isOpen: currentBug?.isOpen ?? true,
      stillInList: Boolean(currentBug?.stillInList)
    }
  });
});

app.put("/api/tickets/:ticketId/linked-bug", async (req, res) => {
  const bugId = req.body?.bugId;

  if (!bugId) {
    throw new HttpError(400, "bugId is required.");
  }

  const bug = await findBug(bugId);

  if (!bug) {
    throw new HttpError(404, "That bug is no longer in the ClickUp list. Refresh and pick another.");
  }

  const linkedBug = await linkBug(req.params.ticketId, bug, req.query.userEmail);

  res.json({
    linkedBug: { ...linkedBug, currentStatus: bug.status, isOpen: bug.isOpen, stillInList: true }
  });
});

app.delete("/api/tickets/:ticketId/linked-bug", async (req, res) => {
  await unlinkBug(req.params.ticketId);
  res.json({ linkedBug: null });
});

app.use((error, req, res, next) => {
  console.error(error.message);

  if (error.expose) {
    return res.status(error.status).json({ error: error.message });
  }

  res.status(502).json({ error: "Something went wrong talking to HubSpot or ClickUp. Check the service logs." });
});

app.listen(config.port, () => {
  console.log(`Sync service listening on port ${config.port}`);
  getBugData().catch((error) => console.error(`Initial bug load failed: ${error.message}`));
});
