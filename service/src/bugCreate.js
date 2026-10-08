import { config } from "./config.js";
import { createTask } from "./clickup.js";
import { addBugToCache, getBugData } from "./bugCache.js";
import { getBugLists } from "./bugLists.js";
import { HttpError } from "./httpError.js";
import { buildBugDescription, buildCustomFields } from "./bugTemplate.js";
import { getTicketContext } from "./ticketContext.js";

const MAX_NAME_LENGTH = 255;

export const PRIORITIES = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4
};

function pickTags(requested, available) {
  const allowed = new Set(available.map((tag) => tag.toLowerCase()));
  const chosen = (Array.isArray(requested) ? requested : [])
    .map((tag) => String(tag).trim().toLowerCase())
    .filter((tag) => allowed.has(tag));

  return [...new Set([...config.clickupBugTags, ...chosen])];
}

export async function createBug({ name, describe, expected, steps, priority, tags, ticketId, portalId, userEmail }) {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    throw new HttpError(400, "A bug name is required.");
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new HttpError(400, `Keep the bug name under ${MAX_NAME_LENGTH} characters.`);
  }

  if (priority && !PRIORITIES[priority]) {
    throw new HttpError(400, "Priority must be urgent, high, normal or low.");
  }

  const [context, lists, data] = await Promise.all([
    ticketId ? getTicketContext(ticketId, portalId) : {},
    getBugLists(),
    getBugData()
  ]);

  const task = await createTask(lists.current.id, {
    name: trimmedName,
    tags: pickTags(tags, data.tags),
    priority: priority ? PRIORITIES[priority] : null,
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
