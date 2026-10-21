import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

/** Centred frosted card used by sign-in, the code step and the authenticator setup. */
export function AuthShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className={wide ? "w-full max-w-[560px]" : "w-full max-w-[420px]"}>
        <div className="glass-strong rounded-[2rem] p-7 sm:p-10">
          <Link href="/" aria-label="MultiVoice home"><Logo /></Link>
          {children}
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted"><ShieldCheck size={14} /> Protected by two-factor sign-in</p>
      </div>
    </main>
  );
}
