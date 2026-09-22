import { config } from "./config.js";
import { getList, getListTasks, getTaskOrNull } from "./clickup.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const CLOSED_STATUS_TYPES = ["closed", "done"];

let cache = null;
let refreshPromise = null;

function toBug(task) {
  return {
    id: task.id,
    customId: task.custom_id ?? null,
    name: task.name,
    status: task.status.status,
    isOpen: !CLOSED_STATUS_TYPES.includes(task.status.type),
    url: task.url,
    updatedAt: Number(task.date_updated)
  };
}

function getStatuses(list, bugs) {
  if (list.statuses?.length) {
    return list.statuses
      .filter((status) => status.type !== "closed")
      .sort((a, b) => Number(a.orderindex) - Number(b.orderindex))
      .map((status) => status.status);
  }

  return [...new Set(bugs.map((bug) => bug.status))];
}

async function loadBugs() {
  if (!config.clickupBugListId) {
    throw new Error("CLICKUP_BUG_LIST_ID is not set.");
  }

  const [list, tasks] = await Promise.all([
    getList(config.clickupBugListId),
    getListTasks(config.clickupBugListId)
  ]);

  const bugs = tasks.map(toBug);
  console.log(`Loaded ${bugs.length} bugs from ClickUp list "${list.name}"`);

  return {
    listName: list.name,
    statuses: getStatuses(list, bugs),
    bugs,
    loadedAt: Date.now()
  };
}

function startRefresh() {
  if (!refreshPromise) {
    refreshPromise = loadBugs()
      .then((data) => {
        cache = data;
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function getBugData({ forceRefresh = false } = {}) {
  if (!cache || forceRefresh) {
    return startRefresh();
  }

  if (Date.now() - cache.loadedAt > CACHE_TTL_MS) {
    startRefresh().catch((error) => console.error(`Background bug refresh failed: ${error.message}`));
  }

  return cache;
}

export async function findBug(bugId) {
  const cached = await getBugData();
  const bug = cached.bugs.find((candidate) => candidate.id === bugId);

  if (bug) {
    return bug;
  }

  const refreshed = await getBugData({ forceRefresh: true });
  return refreshed.bugs.find((candidate) => candidate.id === bugId) ?? null;
}

export function addBugToCache(task) {
  const bug = toBug(task);

  if (cache) {
    cache.bugs = [bug, ...cache.bugs.filter((candidate) => candidate.id !== bug.id)];
  }

  return bug;
}

export async function getCurrentBug(bugId) {
  const cached = await getBugData();
  const bug = cached.bugs.find((candidate) => candidate.id === bugId);

  if (bug) {
    return { ...bug, stillInList: true };
  }

  const task = await getTaskOrNull(bugId);

  if (!task) {
    return null;
  }

  return { ...toBug(task), stillInList: task.list?.id === config.clickupBugListId };
}
