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

function clickupPost(path, body) {
  return requestJson(
    `${CLICKUP_API}${path}`,
    {
      method: "POST",
      headers: { Authorization: config.clickupApiToken, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    },
    `ClickUp POST ${path}`
  );
}

export function createTask(listId, task) {
  return clickupPost(`/list/${listId}/task`, task);
}

export function createTaskComment(taskId, commentText) {
  return clickupPost(`/task/${encodeURIComponent(taskId)}/comment`, { comment_text: commentText, notify_all: false });
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

export async function getSpaceLists(spaceId) {
  const [folders, folderless] = await Promise.all([getFolders(spaceId), getFolderlessLists(spaceId)]);
  return [...folders.flatMap((folder) => folder.lists ?? []), ...folderless];
}

export async function getSpaceTags(spaceId) {
  const data = await clickupRequest(`/space/${spaceId}/tag`);
  return (data.tags ?? []).map((tag) => tag.name);
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
