import { cn } from "@/lib/util";

/** MultiVoice mark: a blue gradient tile with a speech bubble and sound bars (CSS gradient, so any number of copies render). */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center bg-gradient-to-br from-sky-400 via-blue-600 to-blue-700 shadow-[0_8px_18px_-8px_rgb(37_99_235/0.8)]", className)}
      style={{ width: size, height: size, borderRadius: size * 0.29 }}
    >
      <svg width={size * 0.7} height={size * 0.7} viewBox="10 8 28 32">
        <path d="M12 15.5a5.5 5.5 0 0 1 5.5-5.5h13a5.5 5.5 0 0 1 5.5 5.5v11a5.5 5.5 0 0 1-5.5 5.5H22l-6.5 5.5V32A5.5 5.5 0 0 1 12 26.5Z" fill="#fff" fillOpacity="0.95" />
        <g fill="#2563eb">
          <rect x="17.5" y="18" width="2.6" height="6" rx="1.3" />
          <rect x="22.7" y="14.5" width="2.6" height="13" rx="1.3" />
          <rect x="27.9" y="17" width="2.6" height="8" rx="1.3" />
        </g>
      </svg>
    </span>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span className={cn("block text-[1.05rem] font-extrabold tracking-[-0.02em]", light ? "text-white" : "text-ink")}>
          Multi<span className={light ? "text-sky-200" : "text-primary"}>Voice</span>
        </span>
        <span className={cn("mt-0.5 block text-[0.62rem] font-bold uppercase tracking-[0.2em]", light ? "text-white/70" : "text-muted")}>Calling Agent</span>
      </span>
    </span>
  );
}
