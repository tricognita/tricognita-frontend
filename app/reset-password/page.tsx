import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, sessionCookieName } from "@/lib/auth";
import ResetPasswordForm from "./ResetPasswordForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifySession(token);

  // Guard: if not logged in, or already reset, get out.
  if (!session) {
    redirect("/login");
  }

  if (!session.mustReset) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 font-mono">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-900/20 border border-violet-800/50 mb-6">
            <svg
              className="w-8 h-8 text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Security Rotation Required
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Bootstrap credentials detected. You must set a unique, strong password to continue.
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <ResetPasswordForm email={session.email} />
        </div>

        <div className="text-center space-y-4">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
            Tricognita Production Security Protocol v5.2
          </p>
          <div className="flex justify-center gap-4">
            <div className="h-1 w-8 bg-emerald-500/20 rounded-full" />
            <div className="h-1 w-8 bg-violet-500/50 rounded-full animate-pulse" />
            <div className="h-1 w-8 bg-zinc-800 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
