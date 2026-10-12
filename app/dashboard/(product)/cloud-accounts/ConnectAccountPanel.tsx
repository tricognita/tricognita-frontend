"use client";

import { useEffect, useState } from "react";
import { Button, Card, HStack, VStack } from "@/lib/ui";
import {
  connectAccount,
  fetchAwsTrust,
  runAssessment,
  testConnection,
  type AssessmentSummary,
  type AwsTrust,
} from "@/lib/api/cloud-onboarding";

/**
 * Connect a cloud account: AWS through a cross-account IAM role bound to the
 * platform ExternalId, Azure through a service principal with Reader.
 *
 * Each step reports what the backend actually said. A connection is saved first,
 * then tested against the real provider, then verified; a failed test is shown
 * with the provider's reason and the saved connection stays visible so it can be
 * fixed or disconnected. Nothing here says "connected" before a test passed.
 */

type Provider = "aws" | "azure";
type Step =
  | { kind: "idle" }
  | { kind: "working"; what: string }
  | { kind: "error"; message: string }
  | { kind: "tested"; ok: boolean; id: string; detail: string }
  | { kind: "verified"; summary: AssessmentSummary };

const INPUT =
  "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[var(--text-sm)] text-[var(--fg)] font-mono w-full";
const LABEL = "text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className="text-[10px] text-[var(--fg-subtle)]">{hint}</span>}
    </label>
  );
}

const ROLE_ARN = /^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]+$/;
const GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

export function ConnectAccountPanel({ onChanged, onClose }: { onChanged: () => void; onClose: () => void }) {
  const [provider, setProvider] = useState<Provider>("aws");
  const [step, setStep] = useState<Step>({ kind: "idle" });

  // AWS
  const [trust, setTrust] = useState<AwsTrust | null>(null);
  const [trustError, setTrustError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [region, setRegion] = useState("ap-south-1");
  // Azure
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");

  useEffect(() => {
    if (provider !== "aws" || trust || trustError) return;
    let live = true;
    fetchAwsTrust()
      .then((t) => live && setTrust(t))
      .catch((e: unknown) => live && setTrustError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [provider, trust, trustError]);

  const busy = step.kind === "working";
  const awsValid = label.trim() !== "" && ROLE_ARN.test(roleArn.trim()) && region.trim() !== "";
  const azureValid =
    label.trim() !== "" &&
    GUID.test(tenantId.trim()) &&
    GUID.test(clientId.trim()) &&
    GUID.test(subscriptionId.trim()) &&
    clientSecret !== "";
  const canSubmit = !busy && (provider === "aws" ? awsValid && !!trust : azureValid);

  const trustPolicy = trust
    ? JSON.stringify(
        {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: trust.platformPrincipalArn ?? "<unavailable: see the note above>" },
              Action: "sts:AssumeRole",
              Condition: { StringEquals: { "sts:ExternalId": trust.externalId } },
            },
          ],
        },
        null,
        2,
      )
    : "";

  async function submit() {
    setStep({ kind: "working", what: "Saving the connection" });
    let id: string;
    try {
      const accountMatch = /^arn:aws:iam::(\d{12}):/.exec(roleArn.trim());
      ({ id } =
        provider === "aws"
          ? await connectAccount({
              provider: "aws",
              label: label.trim(),
              role_arn: roleArn.trim(),
              account_id: accountMatch?.[1],
              regions: [region.trim()],
            })
          : await connectAccount({
              provider: "azure",
              label: label.trim(),
              azure_tenant_id: tenantId.trim(),
              azure_client_id: clientId.trim(),
              azure_client_secret: clientSecret,
              azure_subscription_id: subscriptionId.trim(),
            }));
    } catch (e) {
      setStep({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      return;
    }
    setClientSecret("");
    onChanged();
    setStep({ kind: "working", what: "Testing the connection against the provider" });
    try {
      const t = await testConnection(id);
      setStep({
        kind: "tested",
        ok: t.ok,
        id,
        detail: t.ok
          ? `Connected as ${t.identity ?? "the configured identity"}${t.accountId ? ` (${t.accountId})` : ""}.`
          : `The provider refused the connection: ${t.error ?? "no reason given"}`,
      });
      onChanged();
    } catch (e) {
      setStep({ kind: "error", message: `Saved, but the connection could not be tested: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  async function verify(id: string) {
    setStep({ kind: "working", what: "Verifying the account (this reads the account and can take up to a minute)" });
    try {
      const summary = await runAssessment(id);
      setStep({ kind: "verified", summary });
      onChanged();
    } catch (e) {
      setStep({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <Card>
      <VStack gap="md">
        <HStack gap="sm" justify="between" align="center" className="flex-wrap">
          <span className="text-[var(--text-sm)] font-medium text-[var(--fg)]">Connect a cloud account</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </HStack>

        <HStack gap="xs" role="tablist" aria-label="Provider">
          {(["aws", "azure"] as const).map((p) => (
            <Button
              key={p}
              role="tab"
              aria-selected={provider === p}
              variant={provider === p ? "secondary" : "ghost"}
              size="sm"
              disabled={busy}
              onClick={() => {
                setProvider(p);
                setStep({ kind: "idle" });
              }}
            >
              {p === "aws" ? "Amazon Web Services" : "Microsoft Azure"}
            </Button>
          ))}
        </HStack>

        <Field label="Name" hint="Your own name for this account. It is how it appears everywhere in the product.">
          <input className={INPUT} value={label} onChange={(e) => setLabel(e.target.value)} autoComplete="off" />
        </Field>

        {provider === "aws" ? (
          <VStack gap="sm">
            <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
              Create a read-only IAM role in the account, attach the AWS managed policies{" "}
              <code>SecurityAudit</code> and <code>ViewOnlyAccess</code>, and give it this trust policy. The
              ExternalId is generated for your organisation and cannot be changed.
            </p>
            {!trust && !trustError && (
              <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">Loading the trust details…</p>
            )}
            {trustError && (
              <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)]">
                Could not load the trust details: {trustError}
              </p>
            )}
            {trust && !trust.platformPrincipalArn && (
              <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)]">
                Tricognita cannot currently determine the identity your role must trust
                ({trust.platformPrincipalError ?? "unknown"}). Connecting is disabled until it can: the trust
                policy below would not work.
              </p>
            )}
            {trust && (
              <pre
                aria-label="Trust policy"
                className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-2 text-[10px] text-[var(--fg)]"
              >
                {trustPolicy}
              </pre>
            )}
            <Field label="Role ARN" hint="arn:aws:iam::<12-digit account>:role/<name>">
              <input className={INPUT} value={roleArn} onChange={(e) => setRoleArn(e.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
            <Field label="Region" hint="The region Tricognita reads. One region per connection.">
              <input className={INPUT} value={region} onChange={(e) => setRegion(e.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
          </VStack>
        ) : (
          <VStack gap="sm">
            <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
              Create a service principal with the built-in <code>Reader</code> role on the subscription and enter
              its details. The secret is encrypted when stored and is never shown again.
            </p>
            <Field label="Directory (tenant) ID">
              <input className={INPUT} value={tenantId} onChange={(e) => setTenantId(e.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
            <Field label="Application (client) ID">
              <input className={INPUT} value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
            <Field label="Client secret">
              <input
                className={INPUT}
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                autoComplete="new-password"
                spellCheck={false}
              />
            </Field>
            <Field label="Subscription ID">
              <input className={INPUT} value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
          </VStack>
        )}

        <HStack gap="sm" align="center" className="flex-wrap">
          <Button size="sm" disabled={!canSubmit} onClick={() => void submit()}>
            Save and test connection
          </Button>
          {step.kind === "tested" && step.ok && (
            <Button size="sm" variant="secondary" onClick={() => void verify(step.id)}>
              Verify this account now
            </Button>
          )}
        </HStack>

        <div aria-live="polite" className="text-[var(--text-sm)]">
          {step.kind === "working" && <p className="text-[var(--fg-muted)]">{step.what}…</p>}
          {step.kind === "error" && (
            <p role="alert" className="text-[var(--fg)]">
              {step.message}
            </p>
          )}
          {step.kind === "tested" && (
            <p role={step.ok ? "status" : "alert"} className="text-[var(--fg)]">
              {step.ok ? "Connection test passed. " : "Connection test failed. "}
              {step.detail}
              {!step.ok && " The connection is saved but not usable; fix the role or disconnect it below."}
            </p>
          )}
          {step.kind === "verified" && (
            <p role="status" className="text-[var(--fg)]">
              {step.summary.state === "VERIFIED"
                ? `Verified: ${step.summary.controlsEvaluated} controls evaluated across ${step.summary.resourcesDiscovered} resources (${step.summary.passed} passing, ${step.summary.failed} failing, ${step.summary.drifted} drifted, ${step.summary.notAssessed} not assessed).`
                : `The verification did not complete: ${step.summary.failureReason ?? "no reason given"}.`}
              {step.summary.discoveryWarning ? ` Note: ${step.summary.discoveryWarning}` : ""}
            </p>
          )}
        </div>
      </VStack>
    </Card>
  );
}
