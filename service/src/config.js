import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const requiredVariables = [
  "PUBLIC_BASE_URL",
  "HUBSPOT_CLIENT_SECRET",
  "HUBSPOT_ACCESS_TOKEN",
  "CLICKUP_API_TOKEN",
  "CLICKUP_WORKSPACE_ID"
];

const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(`Missing environment variables: ${missingVariables.join(", ")}`);
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL.replace(/\/$/, ""),
  hubspotClientSecret: process.env.HUBSPOT_CLIENT_SECRET,
  hubspotAccessToken: process.env.HUBSPOT_ACCESS_TOKEN,
  clickupApiToken: process.env.CLICKUP_API_TOKEN,
  clickupWorkspaceId: process.env.CLICKUP_WORKSPACE_ID,
  clickupBugListId: process.env.CLICKUP_BUG_LIST_ID ?? "",
  clickupSearchListIds: (process.env.CLICKUP_SEARCH_LIST_IDS ?? process.env.CLICKUP_BUG_LIST_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  clickupCreateListId: process.env.CLICKUP_CREATE_LIST_ID ?? process.env.CLICKUP_BUG_LIST_ID ?? "",
  clickupBugTags: (process.env.CLICKUP_BUG_TAGS ?? "bug")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
};
