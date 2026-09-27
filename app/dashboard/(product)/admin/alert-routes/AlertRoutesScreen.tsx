"use client";

import {
  AuthorizingState,
  Badge,
  Button,
  Card,
  EmptyState,
  HStack,
  NotAuthorizedState,
  Section,
  VStack,
} from "@/lib/ui";
import {
  ALERT_CHANNEL_LABEL,
  ALERT_EVENT_LABEL,
  alertRoutesByStatus,
  uncoveredAlertEvents,
  type AlertEvent,
  type AlertRoute,
} from "@/lib/domain";
import { useAlertRoutes } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary } from "../QueryBoundary";
import { NoMutationNote } from "../NoMutationNote";

/**
 * Alert routes — where a change in your cloud gets announced.
 *
 * The destination is shown only in the masked form the domain stores. A Slack
 * webhook URL or a full address is a credential in practice, and this page has
 * no reason to hold one.
 *
 * The section that matters most is the last one: an event nobody is notified
 * about is a silence the customer probably did not choose.
 */

const NO_API = "Adding, editing, disabling and test-sending a route arrive with the alert-route API.";

const ALL_EVENTS: readonly AlertEvent[] = ["DRIFT", "NEW_FAILURE", "VERIFICATION_FAILED"];

function RouteRow({ route }: { route: AlertRoute }) {
  return (
    <Card>
      <VStack gap="sm">
        <HStack gap="sm" justify="between" align="start" className="flex-wrap">
          <VStack gap="xs" className="min-w-0">
            <span className="text-[var(--text-sm)] font-medium text-[var(--fg)] break-words">
              {route.name}
            </span>
            <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
              {ALERT_CHANNEL_LABEL[route.channel]} ·{" "}
              <span className="font-mono break-all">{route.destinationMasked}</span>
            </span>
          </VStack>
          <Badge intent={route.enabled ? "success" : "neutral"} size="xs">
            <span aria-hidden="true" className="mr-1">
              {route.enabled ? "●" : "–"}
            </span>
            {route.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </HStack>

        <VStack gap="xs">
          <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
            Notified when
          </span>
          {route.events.length === 0 ? (
            <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
              Nothing — this route is configured but subscribed to no event.
            </span>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {route.events.map((e) => (
                <li key={e} className="text-[var(--text-xs)] text-[var(--fg)]">
                  {ALERT_EVENT_LABEL[e]}
                </li>
              ))}
            </ul>
          )}
        </VStack>
      </VStack>
    </Card>
  );
}

export function AlertRoutesScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const routes = useAlertRoutes();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "manageAlertRoutes")) {
    return <NotAuthorizedState subject="alert routes" askWho="an administrator" />;
  }

  return (
    <VStack gap="lg">
      <NoMutationNote what={NO_API} />

      <Section
        eyebrow="Destinations"
        title="Alert routes"
        description="Where Tricognita announces a change. Destinations are stored and shown masked."
        spacing="sm"
        actions={
          <Button variant="secondary" size="sm" disabled title={NO_API}>
            Add a route
          </Button>
        }
      >
        <QueryBoundary
          query={routes}
          unavailableMessage="The destinations your drift and failure alerts are sent to."
        >
          {(data) =>
            data.length === 0 ? (
              <EmptyState
                variant="bordered"
                title="No alert route configured"
                description="Without a route, drift and failures are recorded in the product but nobody is told."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {alertRoutesByStatus(data).map((r) => (
                  <li key={r.id}>
                    <RouteRow route={r} />
                  </li>
                ))}
              </ul>
            )
          }
        </QueryBoundary>
      </Section>

      <Section
        eyebrow="Coverage"
        title="Events nobody is told about"
        description="An event with no enabled route still happens. It is simply not announced."
        spacing="sm"
      >
        <QueryBoundary
          query={routes}
          unavailableMessage="Which events currently reach a destination."
        >
          {(data) => {
            const uncovered = uncoveredAlertEvents(data, ALL_EVENTS);
            return uncovered.length === 0 ? (
              <EmptyState
                variant="bordered"
                title="Every event reaches someone"
                description="Each event type has at least one enabled route."
              />
            ) : (
              <Card>
                <ul className="flex flex-col gap-1">
                  {uncovered.map((e) => (
                    <li key={e} className="text-[var(--text-sm)] text-[var(--fg)]">
                      {ALERT_EVENT_LABEL[e]}
                      <span className="ml-2 text-[var(--text-xs)] text-[var(--fg-muted)]">
                        — no enabled route
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          }}
        </QueryBoundary>
      </Section>
    </VStack>
  );
}
