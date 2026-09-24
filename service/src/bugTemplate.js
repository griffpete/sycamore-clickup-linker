export const CUSTOM_FIELD_IDS = {
  ticketUrl: "605b126f-fb70-4c6a-9d44-1544dd69323b",
  reportingSchools: "3442ead3-c869-4d64-a3a8-d5d4cdd6d3e4"
};

const DESCRIBE_HELP = "_Details matter. Context is helpful. Screenshots and videos are great._";
const STEPS_HELP = "_What steps are necessary to replicate this issue? Don't assume._";
const SCHOOLS_HELP = "_Include the School ID, username, and ticket URL._";

function reportingLine({ school, username, ticketUrl }) {
  const parts = [school, username].map((part) => part?.trim()).filter(Boolean);
  const prefix = parts.join(", ");

  if (!ticketUrl) {
    return prefix;
  }

  return prefix ? `${prefix}, ticket URL: ${ticketUrl}` : `ticket URL: ${ticketUrl}`;
}

export function buildBugDescription({ describe, expected, steps, school, username, ticketUrl, createdBy }) {
  const sections = [
    "### Describe the issue",
    describe?.trim() || DESCRIBE_HELP,
    "",
    "### **Expected Behavior**",
    expected?.trim() || "",
    "",
    "### Steps to Replicate",
    steps?.trim() || STEPS_HELP,
    "",
    "### Reporting Schools",
    SCHOOLS_HELP,
    reportingLine({ school, username, ticketUrl })
  ];

  if (createdBy) {
    sections.push("", `_Filed from HubSpot by ${createdBy}_`);
  }

  return sections.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildCustomFields({ ticketUrl, school }) {
  const fields = [];

  if (ticketUrl) {
    fields.push({ id: CUSTOM_FIELD_IDS.ticketUrl, value: ticketUrl });
  }

  if (school?.trim()) {
    fields.push({ id: CUSTOM_FIELD_IDS.reportingSchools, value: school.trim() });
  }

  return fields;
}
