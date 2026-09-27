"use client";

import {
  AuthorizingState,
  Button,
  DataTable,
  DateTime,
  EmptyState,
  HStack,
  NotAuthorizedState,
  Section,
  VStack,
  type Column,
} from "@/lib/ui";
import { UserStatusBadge } from "@/lib/product";
import { PRODUCT_ROLE_LABEL, invitedUsers, usersByName, type User } from "@/lib/domain";
import { useUsers } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary } from "../QueryBoundary";
import { NoMutationNote } from "../NoMutationNote";

/**
 * Users — who can see and do what.
 *
 * The product role is shown, not the session role: a customer administrator
 * reasons about "can this person approve a change", not about the ten internal
 * role names the session carries.
 */

const NO_API = "Inviting, changing a role and disabling a user arrive with the user API.";

export function UsersScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const users = useUsers();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "manageUsers")) {
    return <NotAuthorizedState subject="users and their roles" askWho="an administrator" />;
  }

  const columns: Column<User>[] = [
    {
      id: "name",
      header: "Name",
      mobile: "title",
      cell: (u) => <span className="break-words">{u.name}</span>,
    },
    {
      id: "email",
      header: "Email",
      mobile: "supporting",
      cell: (u) => <span className="break-all text-[var(--fg-muted)]">{u.email}</span>,
    },
    {
      id: "role",
      header: "Access",
      mobile: "supporting",
      width: "w-[180px]",
      cell: (u) => PRODUCT_ROLE_LABEL[u.role],
    },
    {
      id: "status",
      header: "Status",
      mobile: "status",
      width: "w-[130px]",
      cell: (u) => <UserStatusBadge status={u.status} size="xs" />,
    },
    {
      id: "lastActive",
      header: "Last active",
      mobile: "supporting",
      width: "w-[160px]",
      cell: (u) =>
        u.lastActiveAt ? (
          <DateTime value={u.lastActiveAt} variant="relative" />
        ) : (
          <span className="text-[var(--fg-subtle)]">Has not signed in</span>
        ),
    },
  ];

  return (
    <VStack gap="lg">
      <NoMutationNote what={NO_API} />

      <Section
        eyebrow="Access"
        title="Users"
        description="Everyone who can sign in to your organisation, and what each of them may do."
        spacing="sm"
        actions={
          <Button variant="secondary" size="sm" disabled title={NO_API}>
            Invite a user
          </Button>
        }
      >
        <QueryBoundary
          query={users}
          unavailableMessage="The people in your organisation and the access each of them has."
        >
          {(data) => {
            const invited = invitedUsers(data);
            return data.length === 0 ? (
              <EmptyState
                variant="bordered"
                title="No users yet"
                description="Your organisation's first administrator is created during onboarding."
              />
            ) : (
              <VStack gap="sm">
                {invited.length > 0 && (
                  <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                    {invited.length} invited {invited.length === 1 ? "person has" : "people have"}{" "}
                    not signed in yet.
                  </p>
                )}
                <DataTable
                  caption="Users in your organisation"
                  rows={usersByName(data)}
                  columns={columns}
                  getRowKey={(u) => u.id}
                  density="compact"
                  empty={<EmptyState variant="compact" title="No users" />}
                />
              </VStack>
            );
          }}
        </QueryBoundary>
      </Section>

      <HStack gap="sm" className="flex-wrap">
        <p className="text-[var(--text-xs)] text-[var(--fg-subtle)] max-w-[75ch]">
          Access is decided by capability, not by job title. A person who can request a change
          cannot necessarily approve it, and approving a change is never the same permission as
          accepting a risk.
        </p>
      </HStack>
    </VStack>
  );
}
