/**
 * GET /api/datasets/export?format=jsonl|csv
 * Downloads the full dataset in LLM fine-tuning format.
 */
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { getEvents } from "@/lib/datasets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifySession(token);
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "jsonl";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10000"), 50000);

  const events = await getEvents(limit);
  const ts = new Date().toISOString().slice(0, 10);

  if (format === "jsonl") {
    // Hugging Face / OpenAI fine-tuning format
    const lines = events.map(e => {
      return JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are ARIA, an AI security copilot for cloud infrastructure. Analyze security events and provide expert recommendations.",
          },
          {
            role: "user",
            content: JSON.stringify({ event_type: e.type, input: e.input, context: e.metadata }),
          },
          {
            role: "assistant",
            content: JSON.stringify({ analysis: e.output, label: e.label }),
          },
        ],
        // Raw fields for custom training pipelines
        id: e.id,
        ts: e.ts,
        type: e.type,
        source: e.source,
        account_id: e.account_id,
        label: e.label,
      });
    });
    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="tricognita-dataset-${ts}.jsonl"`,
      },
    });
  }

  if (format === "csv") {
    const header = "id,ts,type,source,account_id,label,input_summary,output_summary";
    const rows = events.map(e => {
      const inputSummary = JSON.stringify(e.input).slice(0, 200).replace(/"/g, '""');
      const outputSummary = JSON.stringify(e.output).slice(0, 200).replace(/"/g, '""');
      return `"${e.id}","${e.ts}","${e.type}","${e.source}","${e.account_id}","${e.label ?? ""}","${inputSummary}","${outputSummary}"`;
    });
    return new Response([header, ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tricognita-dataset-${ts}.csv"`,
      },
    });
  }

  return Response.json({ error: "format must be jsonl or csv" }, { status: 400 });
}
