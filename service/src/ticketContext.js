import { getTicketProperties } from "./hubspot.js";

const CONTEXT_PROPERTIES = [
  "subject",
  "hs_primary_company_name",
  "freshdesk_company",
  "hs_all_associated_contact_emails",
  "freshdesk_requester_email"
];

function cleanCompany(name) {
  return (name ?? "").replace(/\s*\*\*FD\*\*\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

function firstEmail(value) {
  return (value ?? "").split(";")[0].trim();
}

export async function getTicketContext(ticketId, portalId) {
  const ticket = await getTicketProperties(ticketId, CONTEXT_PROPERTIES).catch(() => null);
  const properties = ticket?.properties ?? {};

  return {
    subject: properties.subject ?? "",
    school: cleanCompany(properties.hs_primary_company_name || properties.freshdesk_company),
    username: firstEmail(properties.hs_all_associated_contact_emails) || properties.freshdesk_requester_email || "",
    ticketUrl: portalId ? `https://app.hubspot.com/contacts/${portalId}/ticket/${ticketId}` : ""
  };
}
