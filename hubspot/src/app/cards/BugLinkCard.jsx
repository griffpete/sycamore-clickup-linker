import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Divider,
  Flex,
  Link,
  LoadingSpinner,
  Input,
  MultiSelect,
  SearchInput,
  Select,
  TextArea,
  Tag,
  Text,
  Tile,
  ToggleGroup,
  hubspot,
  useDebounce
} from "@hubspot/ui-extensions";

const SERVICE_URL = "https://sycamore-clickup-linker.onrender.com";
const REQUEST_TIMEOUT_MS = 30000;
const PAGE_SIZE = 3;
const SEARCH_LIMIT = 100;

const ACTIONS = {
  none: "none",
  existing: "existing",
  create: "create"
};

const ACTION_OPTIONS = [
  { label: "No bug needed", value: ACTIONS.none },
  { label: "Add this ticket to an existing bug", value: ACTIONS.existing },
  { label: "Create a new bug", value: ACTIONS.create }
];

const PRIORITY_OPTIONS = [
  { label: "Not set", value: "" },
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Normal", value: "normal" },
  { label: "Low", value: "low" }
];

hubspot.extend(({ context, actions }) => (
  <ClickUpBugCard ticketId={context.crm.objectId} addAlert={actions.addAlert} />
));

async function callService(path, options = {}) {
  const response = await hubspot.fetch(`${SERVICE_URL}${path}`, {
    timeout: REQUEST_TIMEOUT_MS,
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? `The sync service returned status ${response.status}.`);
  }

  return data;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

const StatusTag = ({ status, isOpen }) => (
  <Tag variant={isOpen ? "info" : "success"}>{status}</Tag>
);

const LinkedBug = ({ bug, isSaving, onUnlink, onChange }) => (
  <Tile compact>
    <Flex direction="column" gap="xs">
      <Text format={{ fontWeight: "demibold" }}>Linked bug</Text>
      <Link href={{ url: bug.url, external: true }}>{bug.name}</Link>
      <Flex align="center" gap="xs" wrap>
        <StatusTag status={bug.currentStatus} isOpen={bug.isOpen} />
      </Flex>
      {!bug.stillInList && (
        <Text variant="microcopy">This bug is no longer in the ClickUp bug lists.</Text>
      )}
      <Text variant="microcopy">
        Linked by {bug.linkedBy || "unknown"} on {formatDate(bug.linkedAt)}
      </Text>
      <Flex gap="xs">
        <Button size="xs" variant="secondary" disabled={isSaving} onClick={onChange}>
          Change bug
        </Button>
        <Button size="xs" variant="transparent" disabled={isSaving} onClick={onUnlink}>
          Unlink
        </Button>
      </Flex>
    </Flex>
  </Tile>
);

const ReportForm = ({ bug, context, isSaving, onCancel, onSubmit }) => {
  const [details, setDetails] = useState("");

  return (
    <Tile compact>
      <Flex direction="column" gap="xs">
        <Text format={{ fontWeight: "demibold" }}>Add this ticket to "{bug.name}"</Text>
        <TextArea
          label="What did the school report?"
          name="reportDetails"
          placeholder="What they saw, where, and anything QA needs to replicate it."
          value={details}
          onInput={setDetails}
          rows={4}
          required
        />
        <Text variant="microcopy">
          {context.school ? `Posted to the bug's activity as a report from ${context.school}, ` : "Posted to the bug's activity "}
          with a link back to this ticket.
        </Text>
        <Flex gap="xs">
          <Button
            size="xs"
            variant="primary"
            disabled={isSaving || !details.trim()}
            onClick={() => onSubmit({ bug, details })}
          >
            Add report and link
          </Button>
          <Button size="xs" variant="secondary" disabled={isSaving} onClick={onCancel}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </Tile>
  );
};

const BugResult = ({ bug, linkedBugId, isSaving, onPick }) => {
  const isLinked = bug.id === linkedBugId;

  return (
    <Tile compact>
      <Flex direction="column" gap="xs">
        <Link href={{ url: bug.url, external: true }}>{bug.name}</Link>
        <Flex justify="between" align="center" gap="xs">
          <StatusTag status={bug.status} isOpen={bug.isOpen} />
          <Button
            size="xs"
            variant={isLinked ? "secondary" : "primary"}
            disabled={isLinked || isSaving}
            onClick={() => onPick(bug)}
          >
            {isLinked ? "Linked" : "Select"}
          </Button>
        </Flex>
      </Flex>
    </Tile>
  );
};

const CreateBugForm = ({ context, tagOptions, isSaving, onCancel, onCreate }) => {
  const [name, setName] = useState(context.subject ?? "");
  const [describe, setDescribe] = useState("");
  const [expected, setExpected] = useState("");
  const [steps, setSteps] = useState("");
  const [priority, setPriority] = useState("");
  const [tags, setTags] = useState([]);

  return (
    <Tile compact>
      <Flex direction="column" gap="xs">
        <Text format={{ fontWeight: "demibold" }}>New bug</Text>
        <Input label="Bug name" name="newBugName" placeholder="Short summary of the problem" value={name} onInput={setName} />
        <Select label="Priority" name="newBugPriority" value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} />
        {tagOptions.length > 0 && (
          <MultiSelect
            label="Tags"
            name="newBugTags"
            placeholder="Which area is affected?"
            value={tags}
            options={tagOptions}
            onChange={setTags}
          />
        )}
        <TextArea
          label="Describe the issue"
          name="newBugDescribe"
          placeholder="Details matter. Context is helpful. Screenshots and videos are great."
          value={describe}
          onInput={setDescribe}
          rows={4}
        />
        <TextArea
          label="Expected behavior"
          name="newBugExpected"
          placeholder="What should happen instead"
          value={expected}
          onInput={setExpected}
          rows={2}
        />
        <TextArea
          label="Steps to replicate"
          name="newBugSteps"
          placeholder="What steps are necessary to replicate this issue? Don't assume."
          value={steps}
          onInput={setSteps}
          rows={3}
        />
        <Flex gap="xs">
          <Button
            size="xs"
            variant="primary"
            disabled={isSaving || !name.trim()}
            onClick={() => onCreate({ name, describe, expected, steps, priority, tags })}
          >
            Create and link
          </Button>
          <Button size="xs" variant="secondary" disabled={isSaving} onClick={onCancel}>
            Cancel
          </Button>
        </Flex>
        <Text variant="microcopy">
          {context.school
            ? `Filed for ${context.school} with a link to this ticket.`
            : "The bug is added to the current ClickUp bug list and linked to this ticket."}
        </Text>
      </Flex>
    </Tile>
  );
};

const ClickUpBugCard = ({ ticketId, addAlert }) => {
  const [linkedBug, setLinkedBug] = useState(null);
  const [isLoadingLink, setIsLoadingLink] = useState(true);
  const [isChanging, setIsChanging] = useState(false);
  const [action, setAction] = useState(ACTIONS.none);
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState("open");
  const [results, setResults] = useState({ bugs: [], total: 0, statuses: [], tags: [], createListName: "" });
  const [isSearching, setIsSearching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [pickedBug, setPickedBug] = useState(null);
  const [bugContext, setBugContext] = useState({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [errorMessage, setErrorMessage] = useState("");
  const debouncedSearchText = useDebounce(searchText, 300);

  useEffect(() => {
    callService(`/api/tickets/${ticketId}/bug-context`)
      .then(setBugContext)
      .catch(() => setBugContext({}));
  }, [ticketId]);

  useEffect(() => {
    setIsLoadingLink(true);

    callService(`/api/tickets/${ticketId}/linked-bug`)
      .then((data) => setLinkedBug(data.linkedBug))
      .catch((error) => setErrorMessage(error.message))
      .finally(() => setIsLoadingLink(false));
  }, [ticketId]);

  useEffect(() => {
    let isCurrent = true;
    const params = new URLSearchParams({
      query: debouncedSearchText,
      status,
      limit: String(SEARCH_LIMIT)
    });

    if (refreshCount > 0) {
      params.set("refresh", "true");
    }

    setIsSearching(true);
    setVisibleCount(PAGE_SIZE);

    callService(`/api/bugs?${params}`)
      .then((data) => isCurrent && setResults(data))
      .catch((error) => isCurrent && setErrorMessage(error.message))
      .finally(() => isCurrent && setIsSearching(false));

    return () => {
      isCurrent = false;
    };
  }, [debouncedSearchText, status, refreshCount]);

  const saveLink = useCallback(
    async (request, successMessage) => {
      setIsSaving(true);
      setErrorMessage("");

      try {
        const data = await request();
        setLinkedBug(data.linkedBug);
        setPickedBug(null);
        setIsChanging(false);
        setAction(ACTIONS.none);
        addAlert({ type: "success", message: successMessage });
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsSaving(false);
      }
    },
    [addAlert]
  );

  const handleReport = ({ bug, details }) =>
    saveLink(
      () =>
        callService(`/api/tickets/${ticketId}/linked-bug`, {
          method: "PUT",
          body: { bugId: bug.id, details }
        }),
      `Added this ticket's report to "${bug.name}"`
    );

  const handleCreate = ({ name, describe, expected, steps, priority, tags }) =>
    saveLink(async () => {
      const created = await callService(`/api/bugs`, {
        method: "POST",
        body: { name, describe, expected, steps, priority, tags, ticketId }
      });

      const linked = await callService(`/api/tickets/${ticketId}/linked-bug`, {
        method: "PUT",
        body: { bugId: created.bug.id, justCreated: true }
      });

      setRefreshCount((count) => count + 1);
      return linked;
    }, `Created and linked "${name.trim()}"`);

  const handleUnlink = () =>
    saveLink(
      () => callService(`/api/tickets/${ticketId}/linked-bug`, { method: "DELETE" }),
      "Unlinked the bug"
    );

  const visibleBugs = results.bugs.slice(0, visibleCount);
  const hasMoreToShow = visibleBugs.length < results.bugs.length;
  const hasMoreThanFetched = !hasMoreToShow && results.total > results.bugs.length;
  const showChooser = !isLoadingLink && (!linkedBug || isChanging);
  const tagOptions = (results.tags ?? []).map((tag) => ({ label: tag, value: tag }));

  const statusOptions = [
    { label: "Open bugs", value: "open" },
    { label: "All statuses", value: "all" },
    ...results.statuses.map((name) => ({ label: name, value: name }))
  ];

  return (
    <Flex direction="column" gap="small">
      {errorMessage && (
        <Alert title="Something went wrong" variant="error">
          {errorMessage}
        </Alert>
      )}

      {isLoadingLink ? (
        <LoadingSpinner label="Loading linked bug" />
      ) : linkedBug ? (
        <LinkedBug bug={linkedBug} isSaving={isSaving} onUnlink={handleUnlink} onChange={() => setIsChanging(true)} />
      ) : null}

      {showChooser && (
        <ToggleGroup
          name="bugAction"
          label={linkedBug ? "Change the linked bug" : "Does this ticket need a bug?"}
          toggleType="radioButtonList"
          options={ACTION_OPTIONS}
          value={action}
          onChange={(value) => {
            setAction(value);
            setPickedBug(null);
          }}
        />
      )}

      {showChooser && action === ACTIONS.none && !linkedBug && (
        <Text variant="microcopy">Most tickets need no bug. Pick an option only when QA or dev should look at it.</Text>
      )}

      {showChooser && action === ACTIONS.existing && (
        <Flex direction="column" gap="xs">
          <Divider />
          {pickedBug ? (
            <ReportForm
              bug={pickedBug}
              context={bugContext}
              isSaving={isSaving}
              onCancel={() => setPickedBug(null)}
              onSubmit={handleReport}
            />
          ) : (
            <>
              <SearchInput
                label="Search bugs"
                name="bugSearch"
                placeholder="Bug name or ID"
                value={searchText}
                onInput={setSearchText}
              />
              <Select label="Status" name="bugStatus" value={status} options={statusOptions} onChange={setStatus} />
              {isSearching ? (
                <LoadingSpinner label="Searching bugs" />
              ) : results.bugs.length === 0 ? (
                <Text variant="microcopy">No bugs match. Try a different search or status.</Text>
              ) : (
                <Flex direction="column" gap="xs">
                  {visibleBugs.map((bug) => (
                    <BugResult
                      key={bug.id}
                      bug={bug}
                      linkedBugId={linkedBug?.id}
                      isSaving={isSaving}
                      onPick={setPickedBug}
                    />
                  ))}
                  <Text variant="microcopy">
                    Showing {visibleBugs.length} of {results.total}
                    {hasMoreThanFetched ? ". Narrow your search to see more." : ""}
                  </Text>
                  {hasMoreToShow && (
                    <Button size="xs" variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                      Load more
                    </Button>
                  )}
                </Flex>
              )}
              <Button size="xs" variant="transparent" onClick={() => setRefreshCount((count) => count + 1)}>
                Refresh from ClickUp
              </Button>
            </>
          )}
        </Flex>
      )}

      {showChooser && action === ACTIONS.create && (
        <Flex direction="column" gap="xs">
          <Divider />
          <CreateBugForm
            context={bugContext}
            tagOptions={tagOptions}
            isSaving={isSaving}
            onCancel={() => setAction(ACTIONS.none)}
            onCreate={handleCreate}
          />
          {results.createListName && (
            <Text variant="microcopy">Files into {results.createListName}.</Text>
          )}
        </Flex>
      )}

      {showChooser && linkedBug && (
        <Button size="xs" variant="transparent" disabled={isSaving} onClick={() => setIsChanging(false)}>
          Keep the current bug
        </Button>
      )}
    </Flex>
  );
};
