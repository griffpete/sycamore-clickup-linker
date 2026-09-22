const DEFAULT_LIMIT = 25;

function matchesStatus(bug, status) {
  if (status === "all") {
    return true;
  }

  if (status === "open") {
    return bug.isOpen;
  }

  return bug.status.toLowerCase() === status.toLowerCase();
}

function matchesTerms(bug, terms) {
  const searchableText = [bug.name, bug.id, bug.customId].filter(Boolean).join(" ").toLowerCase();
  return terms.every((term) => searchableText.includes(term));
}

export function searchBugs(bugs, { query = "", status = "open", limit = DEFAULT_LIMIT } = {}) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const matches = bugs
    .filter((bug) => matchesStatus(bug, status) && matchesTerms(bug, terms))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return {
    total: matches.length,
    bugs: matches.slice(0, limit)
  };
}
