import { searchTickets } from "./hubspot.js";
import { getCurrentBug } from "./bugCache.js";
import { LINK_PROPERTY_NAMES } from "./linkSchema.js";

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

const TICKET_PROPERTIES = [
  "subject",
  LINK_PROPERTY_NAMES.bugId,
  LINK_PROPERTY_NAMES.bugName,
  LINK_PROPERTY_NAMES.bugUrl,
  LINK_PROPERTY_NAMES.bugStatus,
  LINK_PROPERTY_NAMES.linkedAt
];

async function getBugTicketsForCompany(companyId) {
  const tickets = [];
  let after;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await searchTickets({
      filterGroups: [
        {
          filters: [
            { propertyName: "associations.company", operator: "EQ", value: String(companyId) },
            { propertyName: LINK_PROPERTY_NAMES.bugId, operator: "HAS_PROPERTY" }
          ]
        }
      ],
      properties: TICKET_PROPERTIES,
      sorts: [{ propertyName: LINK_PROPERTY_NAMES.linkedAt, direction: "DESCENDING" }],
      limit: PAGE_LIMIT,
      after
    });

    tickets.push(...data.results);
    after = data.paging?.next?.after;

    if (!after) {
      break;
    }
  }

  return tickets;
}

function ticketUrl(ticketId, portalId) {
  return portalId ? `https://app.hubspot.com/contacts/${portalId}/ticket/${ticketId}` : "";
}

function groupByBug(tickets, portalId) {
  const groups = new Map();

  for (const ticket of tickets) {
    const properties = ticket.properties;
    const bugId = properties[LINK_PROPERTY_NAMES.bugId];
    const entry = groups.get(bugId) ?? {
      id: bugId,
      name: properties[LINK_PROPERTY_NAMES.bugName] ?? "",
      url: properties[LINK_PROPERTY_NAMES.bugUrl] ?? "",
      status: properties[LINK_PROPERTY_NAMES.bugStatus] ?? "",
      lastLinkedAt: null,
      tickets: []
    };

    const linkedAt = properties[LINK_PROPERTY_NAMES.linkedAt] ?? null;

    entry.tickets.push({
      id: ticket.id,
      subject: properties.subject ?? "",
      linkedAt,
      url: ticketUrl(ticket.id, portalId)
    });

    if (linkedAt && (!entry.lastLinkedAt || linkedAt > entry.lastLinkedAt)) {
      entry.lastLinkedAt = linkedAt;
    }

    groups.set(bugId, entry);
  }

  return [...groups.values()];
}

async function withCurrentStatus(group) {
  const current = await getCurrentBug(group.id).catch(() => null);

  return {
    ...group,
    name: current?.name || group.name,
    url: current?.url || group.url,
    status: current?.status || group.status,
    isOpen: current ? current.isOpen : true,
    stillInList: Boolean(current?.stillInList),
    ticketCount: group.tickets.length
  };
}

export async function getCompanyBugs(companyId, portalId) {
  const tickets = await getBugTicketsForCompany(companyId);
  const bugs = [];

  for (const group of groupByBug(tickets, portalId)) {
    bugs.push(await withCurrentStatus(group));
  }

  bugs.sort((a, b) => {
    if (a.isOpen !== b.isOpen) {
      return a.isOpen ? -1 : 1;
    }

    return (b.lastLinkedAt ?? "").localeCompare(a.lastLinkedAt ?? "");
  });

  return {
    companyId: String(companyId),
    ticketsWithBugs: tickets.length,
    openCount: bugs.filter((bug) => bug.isOpen).length,
    total: bugs.length,
    bugs
  };
}
