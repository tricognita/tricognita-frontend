import * as React from "react";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

/**
 * NotAuthorizedState / UnavailableState.
 *
 * Three different situations must never look the same (FRONTEND_STATE_MATRIX.md):
 *   empty        — the query worked, there is nothing to show (often good news)
 *   not authorised — this role may not see it; say who can
 *   unavailable  — the capability is not built or enabled yet; say what it will show
 *
 * Neither of these is a security boundary. The backend decides; this explains.
 */

interface NotAuthorizedStateProps {
  /** What was being viewed, e.g. "the audit trail". */
  subject?: string;
  /** Who can grant it, e.g. "an administrator". */
  askWho?: string;
}

export function NotAuthorizedState({
  subject = "this page",
  askWho = "an administrator",
}: NotAuthorizedStateProps) {
  return (
    <EmptyState
      variant="bordered"
      title="You do not have access to this"
      description={`Your role cannot view ${subject}. Ask ${askWho} if you need it.`}
    />
  );
}

interface UnavailableStateProps {
  /** What this surface will show once the capability is live. */
  willShow: string;
  action?: React.ReactNode;
}

export function UnavailableState({ willShow, action }: UnavailableStateProps) {
  return (
    <EmptyState
      variant="bordered"
      title="Not available yet"
      description={willShow}
      action={action}
    />
  );
}

/**
 * AuthorizingState — shown while the session is still loading.
 *
 * A capability cannot be evaluated before the role is known, and rendering the
 * page "optimistically" in the meantime means an unauthorised reader sees the
 * content for as long as the session call takes. On Users that is a list of
 * colleagues' email addresses. This placeholder is what they see instead.
 *
 * It deliberately carries no page detail: the point is that nothing about the
 * protected surface is disclosed until the answer is known.
 */
export function AuthorizingState() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      aria-label="Checking your access"
      className="flex flex-col gap-3"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
