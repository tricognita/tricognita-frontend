"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import type { ARIAStatus, HealingModeState, RCAResult } from "./aria-types";

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

export function useARIAStream(onEvent: (type: string, data: unknown) => void) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    let es: EventSource | null = null;
    let delay = 1000;
    let stopped = false;

    function connect() {
      es = new EventSource("/api/aria/stream");

      es.onopen = () => { delay = 1000; };

      es.onmessage = (e) => {
        try { onEventRef.current("message", JSON.parse(e.data)); } catch {}
      };

      // Named events from Go SSEHub
      ["prediction", "rca_started", "rca_complete", "action", "healed", "finops", "mode_change"].forEach((type) => {
        es!.addEventListener(type, (e) => {
          try { onEventRef.current(type, JSON.parse((e as MessageEvent).data)); } catch {}
        });
      });

      es.onerror = () => {
        es?.close();
        if (!stopped) {
          setTimeout(connect, Math.min(delay, 30000));
          delay = Math.min(delay * 2, 30000);
        }
      };
    }

    connect();
    return () => { stopped = true; es?.close(); };
  }, []);
}

export function useHealingMode() {
  const { data, isLoading } = useSWR<ARIAStatus>("/api/aria/status", fetcher, {
    refreshInterval: 5 * 60_000, // 5 min — SSE stream handles real-time mode changes
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  // Use a local override key so toggling works even when backend is offline.
  // The override SWR key is separate from the remote status so it doesn't get
  // wiped when /api/aria/status re-fetches.
  const { data: modeOverride, mutate: setModeOverride } = useSWR<HealingModeState>(
    "local:healingMode",
    null, // no fetcher — purely local
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  async function mutateMode(newMode: HealingModeState) {
    // Optimistically update local state immediately so the toggle snaps
    await setModeOverride(newMode, false);

    // Best-effort backend sync — silently swallow errors since backend may be offline
    try {
      await fetch("/api/aria/config/healing-mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
    } catch {
      // backend offline — local mode override already applied, nothing to do
    }
  }

  // Prefer the local override, then the remote status, then the default
  const mode: HealingModeState = modeOverride ?? data?.mode ?? "MANUAL_APPROVAL";

  return { mode, mutateMode, isLoading };
}


export function useRCALog(id: string | null) {
  return useSWR<RCAResult>(id ? `/api/aria/rca/${id}` : null, fetcher);
}
