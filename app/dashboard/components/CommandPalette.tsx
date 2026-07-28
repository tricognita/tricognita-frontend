'use client'

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertTriangle, Users, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CommandAction {
  id: string;
  icon: React.ElementType;
  title: string;
  category: string;
  action: () => void;
  shortcut?: string[];
}

export function CommandPalette({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, setIsOpen]);

  // Focus input when opened — both side effects deferred via setTimeout so React
  // does not flag a sync setState inside the effect body (see Next.js
  // @next/next/no-sync-scripts cousin rule).
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
        setQuery("");
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Only real, wired navigation actions are exposed. Non-functional "Actions"
  // (Run Fleet Scan / Generate SOC2 Report / Open CLI Mode) were removed —
  // they console.log'd and closed, i.e. dead buttons. Re-add each ONLY when it
  // routes to a real, working flow (QA finding F-WEB5).
  const actions: CommandAction[] = [
    { id: "2", icon: AlertTriangle, title: "View Active Incidents", category: "Navigation", action: () => { router.push("/dashboard/incidents"); setIsOpen(false); } },
    { id: "3", icon: Activity, title: "Open ARIA Console", category: "Navigation", action: () => { router.push("/dashboard/aria"); setIsOpen(false); } },
    { id: "6", icon: Users, title: "Manage Team Access", category: "Navigation", action: () => { router.push("/dashboard/users"); setIsOpen(false); } },
  ];

  const filtered = query === "" 
    ? actions 
    : actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase()));

  // Group by category
  const grouped = filtered.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-[#05040A] border border-sage-soft rounded-xl shadow-[0_0_40px_rgba(124,58,237,0.15)] overflow-hidden z-[101]"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-sage-soft bg-[#0a0a0a]">
              <Search className="text-matcha-500 w-5 h-5 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask ARIA or type a command..."
                className="flex-1 bg-transparent text-stone-50 placeholder:text-stone-500 outline-none text-lg"
              />
              <kbd className="hidden sm:inline-flex px-2 py-1 rounded bg-moss-hi border border-sage-soft text-[10px] font-mono text-stone-400">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
              {Object.keys(grouped).length === 0 ? (
                <div className="p-8 text-center text-stone-500 font-mono text-xs">
                  No commands found for "{query}"
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="px-3 py-2 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-widest">
                      {category}
                    </div>
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-matcha-500/10 hover:text-matcha-400 text-stone-300 group transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Icon size={16} className="text-stone-400 group-hover:text-matcha-400 transition-colors" />
                            <span className="text-sm font-medium">{item.title}</span>
                          </div>
                          {item.shortcut && (
                            <div className="flex items-center gap-1">
                              {item.shortcut.map(s => (
                                <kbd key={s} className="px-1.5 py-0.5 rounded bg-ink border border-sage-soft text-[10px] font-mono text-stone-500 group-hover:text-matcha-400 group-hover:border-matcha-500/30 transition-colors">
                                  {s}
                                </kbd>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div className="px-4 py-3 bg-[#080808] border-t border-sage-soft flex items-center justify-between text-[10px] font-mono text-stone-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><kbd className="px-1 py-0.5 rounded border border-sage-soft bg-ink">↑↓</kbd> to navigate</span>
                <span className="flex items-center gap-1.5"><kbd className="px-1 py-0.5 rounded border border-sage-soft bg-ink">↵</kbd> to select</span>
              </div>
              <span className="text-stone-600">Tricognita ARIA OS</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
