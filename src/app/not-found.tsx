import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="glass-strong w-full max-w-md rounded-[2rem] p-8 text-center">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-6 text-2xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The page you are looking for does not exist or was moved.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="btn btn-ghost">Home</Link>
          <Link href="/app" className="btn">Portal</Link>
        </div>
      </div>
    </main>
  );
}
