import { config } from "./config.js";
import { createTask } from "./clickup.js";
import { addBugToCache } from "./bugCache.js";
import { HttpError } from "./httpError.js";
import { buildBugDescription, buildCustomFields } from "./bugTemplate.js";

const MAX_NAME_LENGTH = 255;

export async function createBug({ name, describe, expected, steps, school, username, ticketId, portalId, userEmail }) {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    throw new HttpError(400, "A bug name is required.");
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new HttpError(400, `Keep the bug name under ${MAX_NAME_LENGTH} characters.`);
  }

  const ticketUrl = ticketId && portalId ? `https://app.hubspot.com/contacts/${portalId}/ticket/${ticketId}` : "";

  const task = await createTask(config.clickupBugListId, {
    name: trimmedName,
    markdown_description: buildBugDescription({ describe, expected, steps, school, username, ticketUrl, createdBy: userEmail }),
    custom_fields: buildCustomFields({ ticketUrl, school })
  });

  return addBugToCache(task);
}
