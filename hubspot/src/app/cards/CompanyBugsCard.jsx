import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  EmptyState,
  Flex,
  Link,
  LoadingSpinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Text,
  Toggle,
  hubspot
} from "@hubspot/ui-extensions";

const SERVICE_URL = "https://sycamore-clickup-linker.onrender.com";
const REQUEST_TIMEOUT_MS = 30000;

hubspot.extend(({ context }) => (
  <CompanyBugsCard companyId={context.crm.objectId} portalId={context.portal?.id} />
));

async function callService(path) {
  const response = await hubspot.fetch(`${SERVICE_URL}${path}`, { timeout: REQUEST_TIMEOUT_MS });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? `The sync service returned status ${response.status}.`);
  }

  return data;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "";
}

const BugRow = ({ bug }) => (
  <TableRow>
    <TableCell>
      <Flex direction="column" gap="xs">
        <Link href={{ url: bug.url, external: true }}>{bug.name || bug.id}</Link>
        {!bug.stillInList && <Text variant="microcopy">No longer in the ClickUp bug lists.</Text>}
      </Flex>
    </TableCell>
    <TableCell>
      <Tag variant={bug.isOpen ? "info" : "success"}>{bug.status}</Tag>
    </TableCell>
    <TableCell>
      <Flex direction="column" gap="xs">
        {bug.tickets.map((ticket) => (
          <Link key={ticket.id} href={{ url: ticket.url, external: false }}>
            {ticket.subject || `Ticket ${ticket.id}`}
          </Link>
        ))}
      </Flex>
    </TableCell>
    <TableCell>{formatDate(bug.lastLinkedAt)}</TableCell>
  </TableRow>
);

const CompanyBugsCard = ({ companyId, portalId }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setErrorMessage("");

    const params = new URLSearchParams(portalId ? { portalId: String(portalId) } : {});

    callService(`/api/companies/${companyId}/bugs?${params}`)
      .then((result) => isCurrent && setData(result))
      .catch((error) => isCurrent && setErrorMessage(error.message))
      .finally(() => isCurrent && setIsLoading(false));

    return () => {
      isCurrent = false;
    };
  }, [companyId, portalId, refreshCount]);

  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);

  if (isLoading) {
    return <LoadingSpinner label="Loading ClickUp bugs" />;
  }

  if (errorMessage) {
    return (
      <Flex direction="column" gap="sm">
        <Alert title="Could not load bugs" variant="error">
          {errorMessage}
        </Alert>
        <Button size="xs" variant="secondary" onClick={refresh}>
          Try again
        </Button>
      </Flex>
    );
  }

  const bugs = (data?.bugs ?? []).filter((bug) => showCompleted || bug.isOpen);

  if (!data || data.total === 0) {
    return (
      <EmptyState title="No ClickUp bugs yet" layout="vertical" reverseOrder>
        <Text>No ClickUp bugs are linked to this company's tickets. Bugs appear here once an agent links one from a ticket.</Text>
      </EmptyState>
    );
  }

  return (
    <Flex direction="column" gap="sm">
      <Flex justify="between" align="center" wrap>
        <Text>
          {data.openCount} open of {data.total} bug{data.total === 1 ? "" : "s"} across {data.ticketsWithBugs} ticket
          {data.ticketsWithBugs === 1 ? "" : "s"}
        </Text>
        <Flex align="center" gap="sm">
          <Toggle label="Show completed" name="showCompleted" checked={showCompleted} onChange={setShowCompleted} size="sm" />
          <Button size="xs" variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </Flex>
      </Flex>
      {bugs.length === 0 ? (
        <Text variant="microcopy">All {data.total} linked bugs are completed. Turn on "Show completed" to see them.</Text>
      ) : (
        <Table bordered>
          <TableHead>
            <TableRow>
              <TableHeader>Bug</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Tickets from this company</TableHeader>
              <TableHeader>Last linked</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {bugs.map((bug) => (
              <BugRow key={bug.id} bug={bug} />
            ))}
          </TableBody>
        </Table>
      )}
    </Flex>
  );
};
