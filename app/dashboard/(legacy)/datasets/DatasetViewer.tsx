"use client";

import { useState } from "react";
import useSWR from "swr";
import { Database, Download, Tag, Trash2, Search, CheckCircle2, Clock, ChevronDown } from "lucide-react";
import { ConfirmDangerous } from "@/lib/ui";

type DatasetEvent = {
  id: string;
  ts: string;
  type: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  label: string | null;
  source: string;
  account_id: string;
  user_email?: string;
  metadata: Record<string, unknown>;
};

type ApiResponse = {
  events: DatasetEvent[];
  total: number;
  counts: Record<string, number>;
  storage: { redis: boolean; s3_bucket: string; memory_count: number };
};

const TYPE_COLORS: Record<string, string> = {
  scan_result:      "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
  aria_prediction:  "bg-violet-900/40 text-violet-300 border-violet-700/40",
  jit_approval:     "bg-cyan-900/40 text-cyan-300 border-cyan-700/40",
  jit_rejection:    "bg-rose-900/40 text-rose-300 border-rose-700/40",
  finops_terminate: "bg-amber-900/40 text-amber-300 border-amber-700/40",
  user_login:       "bg-blue-900/40 text-blue-300 border-blue-700/40",
  compliance_report:"bg-purple-900/40 text-purple-300 border-purple-700/40",
  finding:          "bg-red-900/40 text-red-300 border-red-700/40",
  remediation:      "bg-teal-900/40 text-teal-300 border-teal-700/40",
  manual_approval:  "bg-orange-900/40 text-orange-300 border-orange-700/40",
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DatasetViewer() {
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState<Record<string, string>>({});
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const { data, isLoading, mutate } = useSWR<ApiResponse>(
    `/api/datasets?limit=500${typeFilter ? `&type=${typeFilter}` : ""}`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const events = (data?.events ?? []).filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.type.includes(q) ||
      e.user_email?.toLowerCase().includes(q) ||
      e.account_id.includes(q) ||
      e.label?.toLowerCase().includes(q) ||
      JSON.stringify(e.input).toLowerCase().includes(q)
    );
  });

  async function handleLabel(id: string) {
    const label = labelInput[id];
    if (!label) return;
    await fetch("/api/datasets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label }),
    });
    mutate();
  }

  async function handleClear() {
    setClearing(true);
    await fetch("/api/datasets", { method: "DELETE" });
    await mutate();
    setClearing(false);
    setConfirmClear(false);
  }

  return (
    <div className="space-y-6">
      <ConfirmDangerous
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClear}
        loading={clearing}
        title="Delete ALL dataset events?"
        description="This permanently removes every captured training/audit event from Redis and memory. This cannot be undone."
        confirmLabel="Delete all events"
      />

      {/* Storage Status */}
      {data?.storage && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`px-4 py-3 rounded-xl border ${data.storage.redis ? "bg-emerald-950/30 border-emerald-800/40" : "bg-zinc-900 border-zinc-800"} flex items-center gap-3`}>
            <div className={`w-2 h-2 rounded-full ${data.storage.redis ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
            <div>
              <div className="text-xs font-semibold text-zinc-300">Redis Cache</div>
              <div className="text-[10px] text-zinc-500">{data.storage.redis ? "Connected — fast indexed reads" : "Not configured — install Upstash"}</div>
            </div>
          </div>
          <div className="px-4 py-3 rounded-xl border bg-blue-950/30 border-blue-800/40 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-zinc-300">S3 Storage</div>
              <div className="text-[10px] text-zinc-500 truncate">{data.storage.s3_bucket}</div>
            </div>
          </div>
          <div className="px-4 py-3 rounded-xl border bg-zinc-900 border-zinc-800 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <div>
              <div className="text-xs font-semibold text-zinc-300">In Memory</div>
              <div className="text-[10px] text-zinc-500">{data.storage.memory_count} events cached</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter(null)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${!typeFilter ? "bg-violet-600 border-violet-500 text-white" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
        >
          All Events ({data?.total ?? 0})
        </button>
        {Object.entries(data?.counts ?? {}).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? null : type)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${typeFilter === type ? "bg-violet-600 border-violet-500 text-white" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
          >
            {type.replace(/_/g, " ")} ({count})
          </button>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search events, emails, labels..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <a
          href="/api/datasets/export?format=jsonl"
          download
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export JSONL
        </a>
        <a
          href="/api/datasets/export?format=csv"
          download
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold border border-zinc-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </a>
        <button
          onClick={() => setConfirmClear(true)}
          disabled={clearing}
          className="flex items-center gap-2 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 rounded-lg text-xs font-semibold border border-rose-800/40 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {clearing ? "Clearing…" : "Clear All"}
        </button>
      </div>

      {/* Event Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600 space-y-3">
          <Database className="w-12 h-12" />
          <p className="font-mono text-sm">No events collected yet.</p>
          <p className="text-xs">Trigger a scan, approve a JIT request, or log in to start collecting data.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(event => {
            const isExpanded = expandedId === event.id;
            const typeStyle = TYPE_COLORS[event.type] ?? "bg-zinc-900/40 text-zinc-300 border-zinc-700/40";
            return (
              <div key={event.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                >
                  {/* Type badge */}
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap ${typeStyle}`}>
                    {event.type.replace(/_/g, " ")}
                  </span>
                  {/* Timestamp */}
                  <span className="text-[10px] font-mono text-zinc-600 whitespace-nowrap">
                    {new Date(event.ts).toLocaleString()}
                  </span>
                  {/* User */}
                  {event.user_email && (
                    <span className="text-xs text-zinc-500 truncate max-w-[160px]">{event.user_email}</span>
                  )}
                  {/* Label */}
                  {event.label ? (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <CheckCircle2 className="w-3 h-3" /> {event.label}
                    </span>
                  ) : (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-700 font-mono">
                      <Clock className="w-3 h-3" /> unlabeled
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 px-4 py-4 space-y-4 bg-zinc-950/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">Input</div>
                        <pre className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                          {JSON.stringify(event.input, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">Output</div>
                        <pre className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                          {JSON.stringify(event.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                    {/* Label input */}
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-zinc-600" />
                      <input
                        value={labelInput[event.id] ?? event.label ?? ""}
                        onChange={e => setLabelInput(p => ({ ...p, [event.id]: e.target.value }))}
                        placeholder="Add training label (e.g. true_positive, false_positive, correct_remediation)"
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                        onKeyDown={e => { if (e.key === "Enter") handleLabel(event.id); }}
                      />
                      <button
                        onClick={() => handleLabel(event.id)}
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Save Label
                      </button>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-700">ID: {event.id} · Account: {event.account_id} · Source: {event.source}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
