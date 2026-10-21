"use client";

import { useEffect } from "react";

/** Shown instead of a blank error page when something on a page fails. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="glass mx-auto mt-10 max-w-lg rounded-3xl p-6 text-center">
      <h1 className="text-lg font-bold">Something went wrong on this page</h1>
      <p className="mt-2 text-sm text-muted">Nothing was lost. Try again; if it keeps happening, send the reference below to your admin.</p>
      {error.digest && <p className="mt-3 font-mono text-xs text-muted">Reference: {error.digest}</p>}
      <button type="button" onClick={reset} className="btn mt-5">Try again</button>
    </div>
  );
}
