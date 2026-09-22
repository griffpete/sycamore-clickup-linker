export const PROPERTY_GROUP = {
  name: "clickup",
  label: "ClickUp"
};

export const LINK_PROPERTY_NAMES = {
  bugId: "clickup_bug_id",
  bugName: "clickup_bug_name",
  bugUrl: "clickup_bug_url",
  bugStatus: "clickup_bug_status",
  linkedAt: "clickup_bug_linked_at",
  linkedBy: "clickup_bug_linked_by"
};

export const LINK_PROPERTIES = [
  {
    name: LINK_PROPERTY_NAMES.bugId,
    label: "ClickUp bug ID",
    description: "ID of the ClickUp bug linked to this ticket.",
    type: "string",
    fieldType: "text"
  },
  {
    name: LINK_PROPERTY_NAMES.bugName,
    label: "ClickUp bug name",
    description: "Name of the ClickUp bug linked to this ticket.",
    type: "string",
    fieldType: "text"
  },
  {
    name: LINK_PROPERTY_NAMES.bugUrl,
    label: "ClickUp bug URL",
    description: "Link to the ClickUp bug.",
    type: "string",
    fieldType: "text"
  },
  {
    name: LINK_PROPERTY_NAMES.bugStatus,
    label: "ClickUp bug status",
    description: "The bug's ClickUp status when it was linked.",
    type: "string",
    fieldType: "text"
  },
  {
    name: LINK_PROPERTY_NAMES.linkedAt,
    label: "ClickUp bug linked at",
    description: "When the bug was linked to this ticket.",
    type: "datetime",
    fieldType: "date"
  },
  {
    name: LINK_PROPERTY_NAMES.linkedBy,
    label: "ClickUp bug linked by",
    description: "Email of the person who linked the bug.",
    type: "string",
    fieldType: "text"
  }
];
