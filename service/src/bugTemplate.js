export const CUSTOM_FIELD_IDS = {
  ticketUrl: "605b126f-fb70-4c6a-9d44-1544dd69323b",
  requestingSchool: "cd1a0dc5-58bd-4b56-8818-4f884c6e3f53"
};

const DESCRIBE_HELP = "Details matter. Context is helpful. Screenshots and videos are great.";
const STEPS_HELP = "What steps are necessary to replicate this issue? Don't assume.";
const SCHOOLS_HELP = "Include the School ID, username, and ticket URL.";

function reportingLine({ school, username, ticketUrl }) {
  const parts = [school, username].map((part) => part?.trim()).filter(Boolean);
  const prefix = parts.join(", ");

  if (!ticketUrl) {
    return prefix;
  }

  return prefix ? `${prefix}, ticket URL: ${ticketUrl}` : `ticket URL: ${ticketUrl}`;
}

export function buildBugDescription({ describe, steps, school, username, ticketUrl, createdBy }) {
  const sections = [
    "Describe the issue",
    describe?.trim() || DESCRIBE_HELP,
    "",
    "Steps to Replicate",
    steps?.trim() || STEPS_HELP,
    "",
    "Reporting Schools",
    SCHOOLS_HELP,
    reportingLine({ school, username, ticketUrl })
  ];

  if (createdBy) {
    sections.push("", `Reported from HubSpot by ${createdBy}`);
  }

  return sections.join("\n").trim();
}

export function buildCustomFields({ ticketUrl, school }) {
  const fields = [];

  if (ticketUrl) {
    fields.push({ id: CUSTOM_FIELD_IDS.ticketUrl, value: ticketUrl });
  }

  if (school?.trim()) {
    fields.push({ id: CUSTOM_FIELD_IDS.requestingSchool, value: school.trim() });
  }

  return fields;
}
