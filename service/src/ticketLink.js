import { getTicketProperties, updateTicketProperties } from "./hubspot.js";
import { LINK_PROPERTY_NAMES } from "./linkSchema.js";

const propertyNames = Object.values(LINK_PROPERTY_NAMES);

function toLinkedBug(properties) {
  if (!properties[LINK_PROPERTY_NAMES.bugId]) {
    return null;
  }

  return {
    id: properties[LINK_PROPERTY_NAMES.bugId],
    name: properties[LINK_PROPERTY_NAMES.bugName],
    url: properties[LINK_PROPERTY_NAMES.bugUrl],
    status: properties[LINK_PROPERTY_NAMES.bugStatus],
    linkedAt: properties[LINK_PROPERTY_NAMES.linkedAt],
    linkedBy: properties[LINK_PROPERTY_NAMES.linkedBy]
  };
}

export async function getLinkedBug(ticketId) {
  const ticket = await getTicketProperties(ticketId, propertyNames);
  return toLinkedBug(ticket.properties);
}

export async function linkBug(ticketId, bug, userEmail) {
  const properties = {
    [LINK_PROPERTY_NAMES.bugId]: bug.id,
    [LINK_PROPERTY_NAMES.bugName]: bug.name,
    [LINK_PROPERTY_NAMES.bugUrl]: bug.url,
    [LINK_PROPERTY_NAMES.bugStatus]: bug.status,
    [LINK_PROPERTY_NAMES.linkedAt]: new Date().toISOString(),
    [LINK_PROPERTY_NAMES.linkedBy]: userEmail ?? ""
  };

  await updateTicketProperties(ticketId, properties);
  return toLinkedBug(properties);
}

export async function unlinkBug(ticketId) {
  const clearedProperties = Object.fromEntries(propertyNames.map((name) => [name, ""]));
  await updateTicketProperties(ticketId, clearedProperties);
}
