import { notifyContactForm } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name, email, company, message } = await req.json();

    if (!name || !email || !company || !message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fire notification + email (non-blocking — never fail the user)
    notifyContactForm(name, email, company, message).catch((err) =>
      console.error("[contact] notify failed:", err)
    );

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("[contact] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
