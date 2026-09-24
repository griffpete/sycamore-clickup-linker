import { config } from "./config.js";
import { createTask } from "./clickup.js";
import { addBugToCache } from "./bugCache.js";
import { HttpError } from "./httpError.js";
import { buildBugDescription, buildCustomFields } from "./bugTemplate.js";
import { getTicketContext } from "./ticketContext.js";

const MAX_NAME_LENGTH = 255;

export async function createBug({ name, describe, expected, steps, ticketId, portalId, userEmail }) {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    throw new HttpError(400, "A bug name is required.");
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new HttpError(400, `Keep the bug name under ${MAX_NAME_LENGTH} characters.`);
  }

  const context = ticketId ? await getTicketContext(ticketId, portalId) : {};

  const task = await createTask(config.clickupCreateListId, {
    name: trimmedName,
    tags: config.clickupBugTags,
    markdown_description: buildBugDescription({
      describe,
      expected,
      steps,
      school: context.school,
      username: context.username,
      ticketUrl: context.ticketUrl
    }),
    custom_fields: buildCustomFields({
      ticketUrl: context.ticketUrl,
      school: context.school,
      username: context.username,
      createdBy: userEmail
    })
  });

  return addBugToCache(task);
}
