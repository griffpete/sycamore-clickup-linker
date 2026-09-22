import { hubspotGetOrNull, hubspotRequest } from "../src/hubspot.js";
import { LINK_PROPERTIES, PROPERTY_GROUP } from "../src/linkSchema.js";

async function ensurePropertyGroup() {
  const existing = await hubspotGetOrNull(`/crm/v3/properties/tickets/groups/${PROPERTY_GROUP.name}`);

  if (existing) {
    console.log(`Property group "${PROPERTY_GROUP.label}" already exists`);
    return;
  }

  await hubspotRequest("POST", "/crm/v3/properties/tickets/groups", PROPERTY_GROUP);
  console.log(`Created property group "${PROPERTY_GROUP.label}"`);
}

async function ensureProperty(definition) {
  const existing = await hubspotGetOrNull(`/crm/v3/properties/tickets/${definition.name}`);

  if (existing) {
    console.log(`Property "${definition.name}" already exists`);
    return;
  }

  await hubspotRequest("POST", "/crm/v3/properties/tickets", {
    groupName: PROPERTY_GROUP.name,
    ...definition
  });
  console.log(`Created property "${definition.name}"`);
}

async function main() {
  await ensurePropertyGroup();

  for (const property of LINK_PROPERTIES) {
    await ensureProperty(property);
  }

  console.log("HubSpot setup complete");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
