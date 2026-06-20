"use client";

import { useState } from "react";
import type { HealingModeState } from "@/lib/aria-types";

interface Props {
  mode: HealingModeState;
  pendingCount: number;
  isLoading: boolean;
  onChange: (next: HealingModeState) => Promise<void>;
}

export function HealingMode({ mode, pendingCount, isLoading, onChange }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAuto = mode === "AUTONOMOUS";

  function handleToggle() {
    if (!isAuto) {
      setConfirming(true);
    } else {
      flip("MANUAL_APPROVAL");
    }
  }

  async function flip(next: HealingModeState) {
    setBusy(true);
    try {
      await onChange(next);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Healing Mode
        </span>
        <button
          role="switch"
          aria-checked={isAuto}
          aria-label="Toggle healing mode"
          disabled={isLoading || busy}
          onClick={handleToggle}
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 ${
            isAuto
              ? "bg-red-600 border-red-500 focus:ring-red-500"
              : "bg-zinc-700 border-zinc-600 focus:ring-zinc-500"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 mt-0.5 rounded-full bg-white shadow transition-transform ${
              isAuto ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className={`text-xs font-semibold ${isAuto ? "text-red-400" : "text-zinc-300"}`}>
          {isAuto ? "AUTONOMOUS" : "MANUAL APPROVAL"}
        </span>
        {isLoading && <span className="text-xs text-zinc-500 animate-pulse">…</span>}
      </div>

      {!isAuto && pendingCount > 0 && (
        <p className="text-xs text-amber-400">
          {pendingCount} action{pendingCount !== 1 ? "s" : ""} awaiting approval
        </p>
      )}

      {confirming && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        >
          <div className="w-80 rounded-lg border border-red-700/50 bg-zinc-950 p-5 shadow-xl">
            <p id="confirm-title" className="text-sm font-semibold text-red-400 mb-2">
              Enable AUTONOMOUS mode?
            </p>
            <p className="text-xs text-zinc-400 mb-4">
              ARIA will execute remediation actions without human approval. This cannot be undone
              for in-flight actions.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirming(false)}
                className="rounded px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                Cancel
              </button>
              <button
                onClick={() => flip("AUTONOMOUS")}
                disabled={busy}
                className="rounded px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {busy ? "Enabling…" : "Enable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
