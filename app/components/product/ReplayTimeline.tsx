"use client";

import { useState } from "react";
import { BEATS, timelineOf, type Beat } from "@/lib/contracts/narrative";

/**
 * ReplayTimeline (product) — scrub a past run's beats. Replay is DETERMINISTIC:
 * seeking to an index always yields the same beat (NARRATIVE G3). The timeline is
 * the ordered non-skipped beats (`timelineOf`); scrubbing calls `onSeek(beat)`.
 *
 * PUBLIC API: skipped (Beat[]), onSeek(beat, index). COMPOSITION: consumes the
 * Narrative contract only. RESPONSIVE: the range fills its container. ACCESSIBILITY:
 * a labelled range input with an aria-live beat readout. PERFORMANCE: pure state.
 */
export interface ReplayTimelineProps {
  skipped?: readonly Beat[];
  onSeek?: (beat: Beat, index: number) => void;
}

export function ReplayTimeline({ skipped = [], onSeek }: ReplayTimelineProps) {
  const timeline = timelineOf(skipped);
  const [i, setI] = useState(0);
  const beat = timeline[i];

  function seek(next: number) {
    const clamped = Math.max(0, Math.min(timeline.length - 1, next));
    setI(clamped);
    onSeek?.(timeline[clamped], clamped);
  }

  return (
    <div className="text-bone font-mono text-xs">
      <label className="flex items-center gap-3">
        <span className="uppercase tracking-[0.1em] text-bone-muted">Replay</span>
        <input
          type="range"
          min={0}
          max={timeline.length - 1}
          value={i}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Scrub narrative replay"
          className="flex-1"
        />
      </label>
      <div aria-live="polite" className="mt-1 text-bone-muted">
        {i + 1}/{timeline.length} · {BEATS[beat].key} — {BEATS[beat].question}
      </div>
    </div>
  );
}
