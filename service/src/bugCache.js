import { getList, getListTasks, getTaskOrNull } from "./clickup.js";
import { getBugLists } from "./bugLists.js";

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
    listId: String(task.list?.id ?? ""),
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

async function loadList(listId) {
  const [list, tasks] = await Promise.all([getList(listId), getListTasks(listId)]);
  return { list, tasks };
}

async function loadBugs(forceRefresh) {
  const lists = await getBugLists({ forceRefresh });
  const loaded = await Promise.all(lists.searchListIds.map(loadList));
  const bugs = [];
  const statuses = [];

  for (const { list, tasks } of loaded) {
    bugs.push(...tasks.map(toBug));

    for (const status of getStatuses(list, tasks.map(toBug))) {
      if (!statuses.includes(status)) {
        statuses.push(status);
      }
    }
  }

  const listName = loaded.map(({ list }) => list.name).join(" + ");
  console.log(`Loaded ${bugs.length} bugs from ${loaded.length} ClickUp list(s): ${listName}`);

  return {
    listName,
    createListName: lists.current.spaceName,
    statuses,
    tags: lists.tags,
    bugs: bugs.sort((a, b) => b.updatedAt - a.updatedAt),
    loadedAt: Date.now()
  };
}

function startRefresh(forceRefresh = false) {
  if (!refreshPromise) {
    refreshPromise = loadBugs(forceRefresh)
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
    return startRefresh(forceRefresh);
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

  const lists = await getBugLists();
  return { ...toBug(task), stillInList: lists.searchListIds.includes(String(task.list?.id)) };
}
