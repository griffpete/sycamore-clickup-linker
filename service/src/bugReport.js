import { createTaskComment } from "./clickup.js";
import { HttpError } from "./httpError.js";
import { getTicketContext } from "./ticketContext.js";

const MAX_DETAILS_LENGTH = 5000;

export function buildReportComment({ details, school, username, ticketUrl, reportedBy }) {
  const lines = ["Additional report from HubSpot"];

  if (school) lines.push(`School: ${school}`);
  if (username) lines.push(`Reporter: ${username}`);
  if (ticketUrl) lines.push(`Ticket: ${ticketUrl}`);
  if (reportedBy) lines.push(`Filed by: ${reportedBy}`);

  lines.push("", details.trim());
  return lines.join("\n");
}

export async function addReportToBug({ bugId, details, ticketId, portalId, userEmail }) {
  const trimmed = details?.trim();

  if (!trimmed) {
    throw new HttpError(400, "Describe what this school reported before linking the bug.");
  }

  if (trimmed.length > MAX_DETAILS_LENGTH) {
    throw new HttpError(400, `Keep the report under ${MAX_DETAILS_LENGTH} characters.`);
  }

  const context = ticketId ? await getTicketContext(ticketId, portalId) : {};

  await createTaskComment(
    bugId,
    buildReportComment({
      details: trimmed,
      school: context.school,
      username: context.username,
      ticketUrl: context.ticketUrl,
      reportedBy: userEmail
    })
  );
}
