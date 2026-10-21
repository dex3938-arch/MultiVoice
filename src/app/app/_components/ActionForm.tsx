"use client";

import { useActionState, useTransition } from "react";
import { CircleCheck } from "lucide-react";
import type { ActionState } from "../actions";

/** A form wired to a server action that shows "Saved" / an error under it. `inline` = one small button (tables). */
export function ActionForm({
  action,
  children,
  className,
  submit = "Save",
  pendingText = "Saving…",
  resetOnOk = false,
  inline = false,
  icon,
  variant = "",
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children?: React.ReactNode;
  className?: string;
  submit?: string;
  pendingText?: string;
  resetOnOk?: boolean;
  inline?: boolean;
  icon?: React.ReactNode;
  variant?: "" | "btn-ghost" | "btn-danger";
}) {
  const [state, run, pending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  // Submit without React's automatic form reset, so a failed save keeps what the user typed.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => run(fd));
  };
  if (inline) {
    return (
      <form onSubmit={onSubmit} className={className ?? "inline-flex flex-wrap items-center gap-2"}>
        {children}
        <button type="submit" disabled={pending} className={`btn btn-sm ${variant}`}>{icon}{pending ? pendingText : submit}</button>
        {state?.ok && <span role="status" className="text-xs font-semibold text-emerald-700">{state.ok}</span>}
        {state?.error && <span role="alert" className="text-xs font-semibold text-rose-700">{state.error}</span>}
      </form>
    );
  }
  return (
    <form onSubmit={onSubmit} className={className} key={resetOnOk && state?.ok ? state.at : undefined}>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={`btn ${variant}`}>{icon}{pending ? pendingText : submit}</button>
        {state?.ok && <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CircleCheck size={16} /> {state.ok}</span>}
        {state?.error && <span role="alert" className="text-sm font-semibold text-rose-700">{state.error}</span>}
      </div>
    </form>
  );
}
