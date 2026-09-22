import { config } from "./config.js";
import { requestJson } from "./http.js";

const CLICKUP_API = "https://api.clickup.com/api/v2";
const PAGE_SIZE = 100;

export function clickupRequest(path) {
  return requestJson(
    `${CLICKUP_API}${path}`,
    { headers: { Authorization: config.clickupApiToken } },
    `ClickUp GET ${path}`
  );
}

export function createTask(listId, task) {
  return requestJson(
    `${CLICKUP_API}/list/${listId}/task`,
    {
      method: "POST",
      headers: { Authorization: config.clickupApiToken, "Content-Type": "application/json" },
      body: JSON.stringify(task)
    },
    `ClickUp POST /list/${listId}/task`
  );
}

export async function getSpaces(workspaceId) {
  const data = await clickupRequest(`/team/${workspaceId}/space?archived=false`);
  return data.spaces;
}

export async function getFolders(spaceId) {
  const data = await clickupRequest(`/space/${spaceId}/folder?archived=false`);
  return data.folders;
}

export async function getFolderlessLists(spaceId) {
  const data = await clickupRequest(`/space/${spaceId}/list?archived=false`);
  return data.lists;
}

export function getList(listId) {
  return clickupRequest(`/list/${listId}`);
}

export async function getTaskOrNull(taskId) {
  try {
    return await clickupRequest(`/task/${encodeURIComponent(taskId)}`);
  } catch (error) {
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getListTasks(listId) {
  const tasks = [];

  for (let page = 0; ; page++) {
    const params = new URLSearchParams({
      page: String(page),
      include_closed: "false",
      subtasks: "true",
      order_by: "updated"
    });

    const data = await clickupRequest(`/list/${listId}/task?${params}`);
    tasks.push(...data.tasks);

    if (data.last_page || data.tasks.length < PAGE_SIZE) {
      return tasks;
    }
  }
}
