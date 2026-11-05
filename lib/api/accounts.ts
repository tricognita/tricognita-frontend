import type { CloudAccount } from "@/lib/domain";
import { apiGet } from "./client";
import type { CloudAccountDTO } from "./dto/control";
import { toCloudAccount } from "./adapters/control";

export async function fetchCloudAccounts(): Promise<CloudAccount[]> {
  const body = await apiGet<{ accounts: CloudAccountDTO[] }>(
    "/api/cloud-accounts",
    "cloud accounts",
  );
  return (body.accounts ?? []).map(toCloudAccount);
}
