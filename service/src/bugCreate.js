import { config } from "./config.js";
import { createTask } from "./clickup.js";
import { addBugToCache } from "./bugCache.js";
import { HttpError } from "./httpError.js";

const MAX_NAME_LENGTH = 255;

function buildDescription({ description, ticketId, portalId, userEmail }) {
  const lines = [description?.trim() || ""];

  if (ticketId && portalId) {
    lines.push("", `Reported from HubSpot ticket: https://app.hubspot.com/contacts/${portalId}/ticket/${ticketId}`);
  }

  if (userEmail) {
    lines.push(`Reported by: ${userEmail}`);
  }

  return lines.join("\n").trim();
}

export async function createBug({ name, description, ticketId, portalId, userEmail }) {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    throw new HttpError(400, "A bug name is required.");
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new HttpError(400, `Keep the bug name under ${MAX_NAME_LENGTH} characters.`);
  }

  const task = await createTask(config.clickupBugListId, {
    name: trimmedName,
    description: buildDescription({ description, ticketId, portalId, userEmail })
  });

  return addBugToCache(task);
}
