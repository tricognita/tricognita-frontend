import type { DataSource } from "./types";
import { fixtureSource } from "./fixture-source";
import { apiSource } from "./api-source";

/**
 * The one switch between fixtures and the real API.
 *
 * Development defaults to fixtures. Production is always the API: a production
 * build that asks for fixtures fails here rather than serving a customer
 * synthetic data, which is the mistake the current dashboard already makes
 * (reconciliation gate §2.1).
 */

const requested = process.env.NEXT_PUBLIC_DATA_SOURCE;
const isProduction =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

if (isProduction && requested === "fixtures") {
  throw new Error(
    "NEXT_PUBLIC_DATA_SOURCE=fixtures is not allowed in a production build. " +
      "Fixtures are development data and must never reach a customer.",
  );
}

const useFixtures = !isProduction && requested !== "api";

export const dataSource: DataSource = useFixtures ? fixtureSource : apiSource;
export const isFixtureData = dataSource.kind === "fixtures";
