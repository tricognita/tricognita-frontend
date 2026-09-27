import type { AlertRoute, CloudAccount } from "@/lib/domain";
import { daysBefore, hoursBefore } from "./time";

/** Three AWS accounts, including one with a real failure state to design against. */
export const FIXTURE_ACCOUNTS: CloudAccount[] = [
  {
    id: "acct-prod",
    alias: "Production",
    provider: "AWS",
    accountIdMasked: "•••• 4821",
    connection: "CONNECTED",
    connectedAt: daysBefore(96),
    lastVerifiedAt: hoursBefore(3),
    regions: ["ap-south-1", "ap-southeast-1"],
  },
  {
    id: "acct-staging",
    alias: "Staging",
    provider: "AWS",
    accountIdMasked: "•••• 7714",
    connection: "CONNECTED",
    connectedAt: daysBefore(96),
    lastVerifiedAt: hoursBefore(3),
    regions: ["ap-south-1"],
  },
  {
    id: "acct-data",
    alias: "Data platform",
    provider: "AWS",
    accountIdMasked: "•••• 2096",
    connection: "PERMISSION_FAILURE",
    connectedAt: daysBefore(41),
    lastVerifiedAt: daysBefore(2),
    regions: ["ap-south-1"],
    message:
      "The role is missing kms:ListKeyRotations. Update the role from the template, then verify again.",
  },
];

export const FIXTURE_ALERT_ROUTES: AlertRoute[] = [
  {
    id: "route-slack",
    name: "Platform team (Slack)",
    channel: "SLACK",
    destinationMasked: "#platform-alerts",
    events: ["DRIFT", "NEW_FAILURE"],
    enabled: true,
  },
  {
    id: "route-email",
    name: "Security lead (email)",
    channel: "EMAIL",
    destinationMasked: "p•••@acme.example",
    events: ["VERIFICATION_FAILED"],
    enabled: true,
  },
];
