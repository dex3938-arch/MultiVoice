import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/guard";
import { AuthShell } from "./AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const s = await getSession();
  if (s) redirect(s.state === "full" ? "/app" : "/setup-mfa");
  const { next } = await searchParams;
  return (
    <AuthShell>
      <h1 className="mt-8 text-[1.6rem] font-extrabold leading-tight tracking-[-0.02em]">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted">Sign in to your calling-agent portal.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-xs text-muted">Trouble signing in? Ask your Super Admin to reset your account.</p>
    </AuthShell>
  );
}
