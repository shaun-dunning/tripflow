"use client";

type ResilientStateProps = {
  eyebrow?: string;
  title: string;
  message: string;
  detail?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function ResilientState({
  eyebrow = "Heads up",
  title,
  message,
  detail,
  actionLabel,
  onAction,
  compact = false,
}: ResilientStateProps) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white/90 shadow-sm ${
        compact ? "px-4 py-3" : "px-5 py-5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-amber-50 text-lg">
          ⚠️
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">{eyebrow}</p>
          <p className="mt-0.5 text-sm font-black text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{message}</p>
          {detail ? (
            <p className="mt-2 truncate rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-medium text-slate-400">
              {detail}
            </p>
          ) : null}
          {actionLabel && onAction ? (
            <button
              onClick={onAction}
              className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white active:scale-95"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
