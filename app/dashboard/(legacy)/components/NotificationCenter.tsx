"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

export interface Notification {
  id: string;
  type:
    | "incident"
    | "action"
    | "healed"
    | "finops"
    | "jit"
    | "info"
    | "lead"
    | "new_user"
    | "user_updated"
    | "new_contact"
    | "new_lead"
    | "scan_complete"
    | "critical_finding"
    | "action_approved"
    | "action_rejected"
    | "jit_approved"
    | "jit_rejected"
    | "jit_requested"
    | "healing_mode"
    | "api_key_created";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

type Action =
  | { kind: "push"; notification: Notification }
  | { kind: "set_history"; notifications: Notification[] }
  | { kind: "mark_read"; id: string }
  | { kind: "mark_all_read" }
  | { kind: "dismiss_toast"; id: string };

interface State {
  notifications: Notification[];
  toasts: string[]; // ids of notifications currently shown as toasts
  initialized: boolean; // whether we've loaded the initial history
}

function reducer(state: State, action: Action): State {
  switch (action.kind) {
    case "push":
      // If we haven't initialized history yet, don't show a toast (prevents toast storm on reload)
      if (!state.initialized) {
        return {
          ...state,
          notifications: [action.notification, ...state.notifications].slice(0, 100),
        };
      }
      return {
        ...state,
        notifications: [action.notification, ...state.notifications].slice(0, 100),
        toasts: [...state.toasts, action.notification.id],
      };
    case "set_history":
      return {
        ...state,
        // Merge without duplicates, keeping order (newest first)
        notifications: [...action.notifications, ...state.notifications]
          .filter((n, i, self) => i === self.findIndex((t) => t.id === n.id))
          .slice(0, 100),
        initialized: true,
      };
    case "mark_read":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      };
    case "mark_all_read":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      };
    case "dismiss_toast":
      return { ...state, toasts: state.toasts.filter((id) => id !== action.id) };
    default:
      return state;
  }
}

const TYPE_STYLE: Record<Notification["type"], { icon: string; accent: string; toast: string }> = {
  incident:        { icon: "⚠",  accent: "text-red-400",    toast: "border-red-700/50 bg-red-950/80" },
  action:          { icon: "⚡",  accent: "text-violet-400", toast: "border-violet-700/50 bg-violet-950/80" },
  healed:          { icon: "✓",  accent: "text-emerald-400",toast: "border-emerald-700/50 bg-emerald-950/80" },
  finops:          { icon: "$",  accent: "text-blue-400",   toast: "border-blue-700/50 bg-blue-950/80" },
  jit:             { icon: "🔑", accent: "text-amber-400",  toast: "border-amber-700/50 bg-amber-950/80" },
  info:            { icon: "i",  accent: "text-zinc-400",   toast: "border-zinc-700/50 bg-zinc-900/90" },
  lead:            { icon: "👤", accent: "text-pink-400",   toast: "border-pink-700/50 bg-pink-950/80" },
  new_lead:        { icon: "👤", accent: "text-pink-400",   toast: "border-pink-700/50 bg-pink-950/80" },
  new_user:        { icon: "👋", accent: "text-sky-400",    toast: "border-sky-700/50 bg-sky-950/80" },
  user_updated:    { icon: "✏",  accent: "text-sky-400",    toast: "border-sky-700/50 bg-sky-950/80" },
  new_contact:     { icon: "✉",  accent: "text-teal-400",   toast: "border-teal-700/50 bg-teal-950/80" },
  scan_complete:   { icon: "🔍", accent: "text-cyan-400",   toast: "border-cyan-700/50 bg-cyan-950/80" },
  critical_finding:{ icon: "🚨", accent: "text-red-400",    toast: "border-red-700/50 bg-red-950/80" },
  action_approved: { icon: "✅", accent: "text-emerald-400",toast: "border-emerald-700/50 bg-emerald-950/80" },
  action_rejected: { icon: "❌", accent: "text-rose-400",   toast: "border-rose-700/50 bg-rose-950/80" },
  jit_approved:    { icon: "🔓", accent: "text-emerald-400",toast: "border-emerald-700/50 bg-emerald-950/80" },
  jit_rejected:    { icon: "🔒", accent: "text-rose-400",   toast: "border-rose-700/50 bg-rose-950/80" },
  jit_requested:   { icon: "🔑", accent: "text-amber-400",  toast: "border-amber-700/50 bg-amber-950/80" },
  healing_mode:    { icon: "⚙",  accent: "text-indigo-400", toast: "border-indigo-700/50 bg-indigo-950/80" },
  api_key_created: { icon: "🗝",  accent: "text-violet-400", toast: "border-violet-700/50 bg-violet-950/80" },
};

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sseEventToNotification(eventType: string, data: string): Notification | null {
  try {
    const payload = JSON.parse(data);
    switch (eventType) {
      case "prediction":
        return {
          id: makeId(),
          type: "incident",
          title: "New Risk Prediction",
          body: `ARN: ${String(payload.resource_arn ?? "unknown").slice(-40)} · Risk ${(payload.risk_score ?? 0).toFixed(2)}`,
          timestamp: new Date().toISOString(),
          read: false,
        };
      case "rca_complete":
        return {
          id: makeId(),
          type: "incident",
          title: "ARIA RCA Complete",
          body: `Root cause analysis finished — session ${String(payload.rca_log_id ?? "").slice(0, 12)}`,
          timestamp: new Date().toISOString(),
          read: false,
        };
      case "action":
        return {
          id: makeId(),
          type: "action",
          title: `Action ${String(payload.status ?? "updated")}`,
          body: `${payload.action_type ?? "Unknown"} on ${String(payload.target_arn ?? "").slice(-30)}`,
          timestamp: new Date().toISOString(),
          read: false,
        };
      case "healed":
        return {
          id: makeId(),
          type: "healed",
          title: "ARIA Healing Complete",
          body: `Pipeline finished — ${payload.actions_executed ?? 0} executed, ${payload.actions_pending ?? 0} pending`,
          timestamp: new Date().toISOString(),
          read: false,
        };
      case "finops":
        return {
          id: makeId(),
          type: "finops",
          title: "FinOps Finding",
          body: `${payload.finding_type ?? "finding"} — $${(payload.estimated_savings_usd ?? 0).toLocaleString()} potential savings`,
          timestamp: new Date().toISOString(),
          read: false,
        };
      case "mode_change":
        return {
          id: makeId(),
          type: "info",
          title: "Healing Mode Changed",
          body: `ARIA now operating in ${payload.mode ?? "unknown"} mode`,
          timestamp: new Date().toISOString(),
          read: false,
        };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function NotificationCenter({ isCollapsed }: { isCollapsed?: boolean }) {
  const [state, dispatch] = useReducer(reducer, { notifications: [], toasts: [], initialized: false });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const push = useCallback((notification: Notification) => {
    dispatch({ kind: "push", notification });
    // Auto-dismiss toast after 5s
    const timer = setTimeout(() => {
      dispatch({ kind: "dismiss_toast", id: notification.id });
      toastTimers.current.delete(notification.id);
    }, 5000);
    toastTimers.current.set(notification.id, timer);
  }, []);

  // Global SSE listener
  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1000;
    const timers = toastTimers.current;

    function connect() {
      if (cancelled) return;
      es = new EventSource("/api/aria/stream");

      const SSE_EVENTS = ["prediction", "rca_complete", "rca_started", "action", "healed", "finops", "mode_change"];

      SSE_EVENTS.forEach((evType) => {
        es!.addEventListener(evType, (e: MessageEvent) => {
          if (cancelled) return;
          const notif = sseEventToNotification(evType, e.data);
          if (notif) push(notif);
        });
      });

      es.onopen = () => { retryDelay = 1000; };
      es.onerror = () => {
        es?.close();
        if (!cancelled) {
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30000);
            connect();
          }, retryDelay);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
      timers.forEach(clearTimeout);
    };
  }, [push]);

  // Centralized platform notifications polling (all event types)
  useEffect(() => {
    const seen = new Set<string>();
    let isFirstPoll = true;

    const poll = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        const items: Notification[] = data.notifications ?? [];
        
        if (isFirstPoll) {
          // On first load, bulk import to history without triggering toasts
          dispatch({ kind: "set_history", notifications: items });
          items.forEach(n => seen.add(n.id));
          isFirstPoll = false;
        } else {
          // On subsequent polls, push new items to trigger toasts
          for (let i = items.length - 1; i >= 0; i--) {
            const n = items[i];
            if (!seen.has(n.id)) {
              seen.add(n.id);
              push({ ...n, read: false });
            }
          }
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 8000); // poll every 8 s
    return () => clearInterval(interval);
  }, [push]);

  // Close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const visibleToasts = state.toasts
    .map((id) => state.notifications.find((n) => n.id === id))
    .filter(Boolean) as Notification[];

  return (
    <>
      {/* Bell button — renders inline wherever this component is placed */}
      <button
        onClick={() => {
          setDrawerOpen(true);
          dispatch({ kind: "mark_all_read" });
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
        className={isCollapsed !== undefined 
          ? `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isCollapsed ? 'justify-center' : ''} text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent`
          : "relative rounded-md p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors"
        }
      >
        <div className="relative flex items-center justify-center">
          <BellIcon />
          {unreadCount > 0 && (
            <span className={isCollapsed !== undefined
              ? "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm border border-red-900"
              : "absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
            }>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        {!isCollapsed && isCollapsed !== undefined && <span className="truncate">Notifications</span>}
      </button>

      {/* Toast stack — fixed viewport, always visible */}
      <div
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {visibleToasts.map((n) => {
          const style = TYPE_STYLE[n.type];
          return (
            <div
              key={n.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-2xl backdrop-blur max-w-xs text-xs transition-all ${style.toast}`}
              role="status"
            >
              <span className={`shrink-0 font-bold text-sm leading-none ${style.accent}`} aria-hidden="true">
                {style.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-100 truncate">{n.title}</p>
                <p className="text-zinc-400 mt-0.5 line-clamp-2">{n.body}</p>
              </div>
              <button
                onClick={() => {
                  dispatch({ kind: "dismiss_toast", id: n.id });
                  const timer = toastTimers.current.get(n.id);
                  if (timer) { clearTimeout(timer); toastTimers.current.delete(n.id); }
                }}
                className="shrink-0 text-zinc-500 hover:text-zinc-300 focus:outline-none"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Notification history drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[150] bg-black/50"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notification history"
            className="fixed right-0 top-0 z-[160] h-full w-full max-w-sm overflow-y-auto bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
              <span className="text-sm font-semibold text-zinc-100">Notifications</span>
              <div className="flex items-center gap-2">
                {state.notifications.length > 0 && (
                  <button
                    onClick={() => dispatch({ kind: "mark_all_read" })}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 focus:outline-none"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  aria-label="Close notifications"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {state.notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-zinc-500">No notifications yet.</p>
                  <p className="text-xs text-zinc-700 mt-1">ARIA events will appear here in real time.</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800/60">
                  {state.notifications.map((n) => {
                    const style = TYPE_STYLE[n.type];
                    return (
                      <li
                        key={n.id}
                        className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                          n.read ? "bg-zinc-950" : "bg-zinc-900/60"
                        }`}
                      >
                        <span className={`shrink-0 font-bold text-sm leading-none mt-0.5 ${style.accent}`} aria-hidden="true">
                          {style.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-semibold truncate ${n.read ? "text-zinc-400" : "text-zinc-100"}`}>
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-violet-500" aria-label="Unread" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-zinc-700 mt-1">
                            {new Date(n.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
