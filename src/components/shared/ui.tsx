"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass-panel rounded-[28px] p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
}) {
  const styles = {
    primary:
      "bg-[var(--accent)] text-slate-950 hover:bg-[var(--accent-strong)]",
    secondary:
      "bg-white/8 text-white hover:bg-white/12 border border-white/10",
    ghost: "bg-transparent text-[var(--muted)] hover:bg-white/6 hover:text-white",
    danger: "bg-[var(--danger)]/16 text-[var(--danger)] hover:bg-[var(--danger)]/24",
  } as const;

  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors",
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-[var(--muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function FieldLabel({
  label,
  htmlFor,
}: {
  label: string;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-white">
      {label}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[var(--accent)]",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[var(--accent)]",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]",
        props.className,
      )}
    />
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="glass-panel animate-fade-up max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[28px] p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
