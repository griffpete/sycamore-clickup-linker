import { hubspotGetOrNull, hubspotRequest } from "../src/hubspot.js";

const OLD_PIPELINE_LABEL = "ClickUp Bugs";
const OLD_PROPERTIES = [
  "clickup_task_id",
  "clickup_url",
  "clickup_status",
  "clickup_priority",
  "clickup_list",
  "clickup_assignees",
  "clickup_updated_at",
  "linked_bug_count"
];
const SEARCH_PAGE_SIZE = 200;
const BATCH_SIZE = 100;
const isConfirmed = process.argv.includes("--confirm");

async function findOldPipeline() {
  const { results } = await hubspotRequest("GET", "/crm/v3/pipelines/tickets");
  return results.find((pipeline) => pipeline.label === OLD_PIPELINE_LABEL) ?? null;
}

async function getTicketIdsInPipeline(pipelineId) {
  const ids = [];
  let after;

  do {
    const response = await hubspotRequest("POST", "/crm/v3/objects/tickets/search", {
      filterGroups: [{ filters: [{ propertyName: "hs_pipeline", operator: "EQ", value: pipelineId }] }],
      properties: ["hs_object_id"],
      limit: SEARCH_PAGE_SIZE,
      after
    });

    ids.push(...response.results.map((ticket) => ticket.id));
    after = response.paging?.next?.after;
  } while (after);

  return ids;
}

async function archiveTickets(ids) {
  for (let start = 0; start < ids.length; start += BATCH_SIZE) {
    const batch = ids.slice(start, start + BATCH_SIZE);
    await hubspotRequest("POST", "/crm/v3/objects/tickets/batch/archive", {
      inputs: batch.map((id) => ({ id }))
    });
    console.log(`Archived ${Math.min(start + BATCH_SIZE, ids.length)} of ${ids.length} bug tickets`);
  }
}

async function getExistingOldProperties() {
  const existing = [];

  for (const name of OLD_PROPERTIES) {
    if (await hubspotGetOrNull(`/crm/v3/properties/tickets/${name}`)) {
      existing.push(name);
    }
  }

  return existing;
}

async function main() {
  const pipeline = await findOldPipeline();
  const ticketIds = pipeline ? await getTicketIdsInPipeline(pipeline.id) : [];
  const oldProperties = await getExistingOldProperties();

  console.log(pipeline ? `Found pipeline "${OLD_PIPELINE_LABEL}" with ${ticketIds.length} bug tickets` : `No "${OLD_PIPELINE_LABEL}" pipeline found`);
  console.log(`Found ${oldProperties.length} old properties${oldProperties.length ? `: ${oldProperties.join(", ")}` : ""}`);

  if (!isConfirmed) {
    console.log("\nDry run: nothing was changed. Run npm run cleanup to remove these.");
    return;
  }

  if (ticketIds.length > 0) {
    await archiveTickets(ticketIds);
  }

  if (pipeline) {
    try {
      await hubspotRequest("DELETE", `/crm/v3/pipelines/tickets/${pipeline.id}`);
      console.log(`Deleted pipeline "${OLD_PIPELINE_LABEL}"`);
    } catch (error) {
      console.error(`Could not delete the pipeline automatically: ${error.message}`);
      console.error("Delete it in Settings > Objects > Tickets > Pipelines once the archived tickets are cleared.");
    }
  }

  for (const name of oldProperties) {
    await hubspotRequest("DELETE", `/crm/v3/properties/tickets/${name}`);
    console.log(`Deleted property "${name}"`);
  }

  console.log("\nCleanup complete");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
