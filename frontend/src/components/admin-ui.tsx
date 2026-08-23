import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {label}
        </p>
        <Icon className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{delta}</p>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)]">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-5 py-4">
        <h2 className="truncate text-base font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

const statusStyles: Record<string, string> = {
  Active: "bg-primary/10 text-primary",
  Draft: "bg-muted text-muted-foreground",
  "Out of Stock": "bg-destructive/10 text-destructive",
  "In Production": "bg-accent/25 text-accent-foreground",
  "Awaiting Print": "bg-primary/10 text-primary",
  "Design Review": "bg-muted text-muted-foreground",
  Shipped: "bg-primary/90 text-primary-foreground",
  Settled: "bg-primary/10 text-primary",
  Pending: "bg-accent/25 text-accent-foreground",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
        statusStyles[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}