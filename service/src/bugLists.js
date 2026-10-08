import { config } from "./config.js";
import { getSpaceLists, getSpaceTags, getSpaces } from "./clickup.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const QUARTER_SPACE = /^(\d{4})\s*Q([1-4])\b.*bugs/i;

let cache = null;
let loadPromise = null;

function quarterKey(space) {
  const match = space.name.match(QUARTER_SPACE);
  return match ? Number(match[1]) * 10 + Number(match[2]) : 0;
}

function pickBugList(lists) {
  return lists.find((list) => /bug/i.test(list.name)) ?? lists[0] ?? null;
}

async function loadBugLists() {
  const spaces = (await getSpaces(config.clickupWorkspaceId))
    .filter((space) => QUARTER_SPACE.test(space.name))
    .sort((a, b) => quarterKey(b) - quarterKey(a));

  const quarterLists = [];

  for (const space of spaces) {
    const list = pickBugList(await getSpaceLists(space.id));

    if (list) {
      quarterLists.push({ id: String(list.id), name: list.name, spaceId: String(space.id), spaceName: space.name });
    }
  }

  const current = config.clickupCreateListId
    ? (quarterLists.find((list) => list.id === config.clickupCreateListId) ?? {
        id: config.clickupCreateListId,
        name: "configured list",
        spaceId: null,
        spaceName: "CLICKUP_CREATE_LIST_ID"
      })
    : quarterLists[0];

  if (!current) {
    throw new Error("No ClickUp space named like '2026 Q4 Bugs' was found and CLICKUP_CREATE_LIST_ID is not set.");
  }

  const searchListIds = [...new Set([current.id, ...quarterLists.map((list) => list.id), ...config.clickupSearchListIds])];
  const tags = current.spaceId
    ? (await getSpaceTags(current.spaceId))
        .filter((tag) => !config.clickupBugTags.includes(tag.toLowerCase()))
        .sort((a, b) => a.localeCompare(b))
    : [];

  console.log(`Creating bugs in "${current.spaceName}" (list ${current.id}); searching ${searchListIds.length} list(s); ${tags.length} tag option(s)`);

  return { current, quarterLists, searchListIds, tags, loadedAt: Date.now() };
}

function startLoad() {
  if (!loadPromise) {
    loadPromise = loadBugLists()
      .then((data) => {
        cache = data;
        return data;
      })
      .finally(() => {
        loadPromise = null;
      });
  }

  return loadPromise;
}

export async function getBugLists({ forceRefresh = false } = {}) {
  if (!cache || forceRefresh) {
    return startLoad();
  }

  if (Date.now() - cache.loadedAt > CACHE_TTL_MS) {
    startLoad().catch((error) => console.error(`Bug list refresh failed: ${error.message}`));
  }

  return cache;
}
