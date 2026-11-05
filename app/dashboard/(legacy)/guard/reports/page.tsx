"use client";

import Link from "next/link";
import { useState } from "react";
import jsPDF from "jspdf";
export default function GuardReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadReport = async (type: string, format: "json" | "pdf") => {
    setLoading(`${type}-${format}`);
    setError(null);
    try {
      const res = await fetch(`/api/guard/report/${type}`);
      if (!res.ok) throw new Error("Failed to generate report");
      
      const data = await res.json();
      
      if (format === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tricognita_${type}_report_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === "pdf") {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("Tricognita Security Intelligence", 20, 20);
        doc.setFontSize(16);
        doc.text(data.report_type.replace(/_/g, " "), 20, 30);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${data.generated_at}`, 20, 40);
        
        let y = 50;
        doc.setTextColor(0);
        doc.setFontSize(12);
        
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === "object" && val !== null && !Array.isArray(val)) {
            doc.setFont("helvetica", "bold");
            doc.text(key.toUpperCase().replace(/_/g, " "), 20, y);
            y += 7;
            doc.setFont("helvetica", "normal");
            for (const [subKey, subVal] of Object.entries(val)) {
              doc.text(`${subKey.replace(/_/g, " ")}: ${subVal}`, 25, y);
              y += 6;
            }
            y += 4;
          }
        }
        
        doc.save(`tricognita_${type}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-8">
      <header className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/guard" className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Compliance Reports
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1 ml-8">Auto-generated audit evidence from AI interaction logs.</p>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          <span>Couldn&apos;t generate report: {error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error" className="text-red-400/70 hover:text-red-200 text-xl leading-none">&times;</button>
        </div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EU AI Act */}
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center border border-blue-800/50">
              <span className="text-blue-400 font-bold text-lg">EU</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">EU AI Act (Article 12)</h2>
              <p className="text-xs text-zinc-400">Interaction & Oversight Log</p>
            </div>
          </div>
          <p className="text-sm text-zinc-300">
            Generates the mandatory interaction logs required for high-risk AI systems under Article 12 of the EU AI Act. Includes PII incident summaries and human oversight documentation.
          </p>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => downloadReport('eu-ai-act', 'pdf')}
              disabled={loading !== null}
              className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 text-white font-semibold text-sm hover:bg-violet-500 transition-colors disabled:opacity-50"
            >
              {loading === 'eu-ai-act-pdf' ? "Generating..." : "Download PDF"}
            </button>
            <button 
              onClick={() => downloadReport('eu-ai-act', 'json')}
              disabled={loading !== null}
              className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {loading === 'eu-ai-act-json' ? "..." : "JSON"}
            </button>
          </div>
        </div>

        {/* CERT-In */}
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-900/30 flex items-center justify-center border border-orange-800/50">
              <span className="text-orange-400 font-bold text-lg">IN</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">CERT-In Compliance</h2>
              <p className="text-xs text-zinc-400">Annual Audit & Incident Pack</p>
            </div>
          </div>
          <p className="text-sm text-zinc-300">
            Proves compliance with India's CERT-In mandate for 180-day log retention and security incident reporting covering your AI workloads.
          </p>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => downloadReport('cert-in', 'pdf')}
              disabled={loading !== null}
              className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 text-white font-semibold text-sm hover:bg-violet-500 transition-colors disabled:opacity-50"
            >
              {loading === 'cert-in-pdf' ? "Generating..." : "Download PDF"}
            </button>
            <button 
              onClick={() => downloadReport('cert-in', 'json')}
              disabled={loading !== null}
              className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {loading === 'cert-in-json' ? "..." : "JSON"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
