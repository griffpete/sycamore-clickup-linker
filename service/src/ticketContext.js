import { getTicketProperties } from "./hubspot.js";

const CONTEXT_PROPERTIES = ["subject", "freshdesk_company", "freshdesk_requester_email"];

function schoolFrom(properties) {
  const company = properties.freshdesk_company;

  if (!company) {
    return "";
  }

  return company.replace(/\s*\*\*FD\*\*\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

export async function getTicketContext(ticketId, portalId) {
  const ticket = await getTicketProperties(ticketId, CONTEXT_PROPERTIES).catch(() => null);
  const properties = ticket?.properties ?? {};

  return {
    subject: properties.subject ?? "",
    school: schoolFrom(properties),
    username: properties.freshdesk_requester_email ?? "",
    ticketUrl: portalId ? `https://app.hubspot.com/contacts/${portalId}/ticket/${ticketId}` : ""
  };
}
