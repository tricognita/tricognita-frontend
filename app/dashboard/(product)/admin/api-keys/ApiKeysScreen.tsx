"use client";

import {
  AuthorizingState, NotAuthorizedState, Section, UnavailableState, VStack } from "@/lib/ui";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";

/**
 * API keys — deliberately empty, and deliberately honest about why.
 *
 * There is no API-key entity in the domain, no fixture and no data contract.
 * Rather than invent a list of keys, a masked prefix format or a created date,
 * this page says what it will show and shows nothing.
 *
 * On a page about credentials that is the only safe answer. A fabricated key
 * list would be worse than useless: an administrator could conclude that a key
 * they never created exists, or that one they did create has been revoked.
 */
export function ApiKeysScreen() {
  const { role, isLoading: sessionLoading } = useSession();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "manageApiKeys")) {
    return <NotAuthorizedState subject="API keys" askWho="an administrator" />;
  }

  return (
    <VStack gap="lg">
      <Section
        eyebrow="Integrations"
        title="API keys"
        description="Keys that let your own systems read your assurance data."
        spacing="sm"
      >
        <UnavailableState willShow="The keys issued for your organisation, when each was created and last used, and which of them have been revoked. Secret values are shown once at creation and never again — this page will not be able to show you one." />
      </Section>

      <p className="text-[var(--text-xs)] text-[var(--fg-subtle)] max-w-[75ch]">
        No key exists for your organisation today, because issuing them is not switched on yet. If
        you need programmatic access before then, ask your Tricognita engineer rather than reusing a
        person&rsquo;s session.
      </p>
    </VStack>
  );
}
