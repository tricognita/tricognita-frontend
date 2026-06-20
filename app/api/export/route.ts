export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { cookies } from "next/headers";
import { recordUsage } from "@/lib/usage-accounting";

export async function GET(req: Request) {
  try {
    const jar = await cookies();
    const sessionToken = jar.get(sessionCookieName())?.value;
    const session = await verifySession(sessionToken);
    
    // Only logged in users can export compliance reports
    if (!session) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";

    // Read the report from disk
    const reportPath = path.join(process.cwd(), "..", "docs", "FLEET-EXECUTIVE-REPORT.json");
    let data = "";
    try {
      data = await fs.readFile(reportPath, "utf-8");
    } catch (e) {
      return NextResponse.json({ error: "No report available. Run a scan first." }, { status: 404 });
    }

    const report = JSON.parse(data);

    if (format === "json") {
      return NextResponse.json(report);
    }

    // Export as CSV by default
    const findings = report.findings || [];
    const headers = ["ID", "Severity", "Type", "Resource", "CIS Benchmark", "MITRE ATT&CK", "Status"];

    const rows = findings.map((f: any, i: number) => {
      const cis = Array.isArray(f.cis) ? f.cis.join("; ") : (f.cis || "N/A");
      const mitre = Array.isArray(f.mitre) ? f.mitre.join("; ") : (f.mitre || "N/A");
      
      return [
        `TR-${(i + 1).toString().padStart(4, "0")}`,
        f.severity,
        f.type,
        f.resource,
        cis,
        mitre,
        "OPEN"
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    recordUsage({
      tenantId: session.tenantId,
      dimension: "exports",
      userEmail: session.email,
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tricognita_compliance_export_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
