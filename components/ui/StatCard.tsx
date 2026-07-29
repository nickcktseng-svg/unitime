import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function StatCard({
  label,
  value,
  hint,
  icon
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink/60 dark:text-white/60">{label}</p>
          <div className="mt-2 text-2xl font-black">{value}</div>
          {hint ? <p className="mt-1 text-xs text-ink/55 dark:text-white/55">{hint}</p> : null}
        </div>
        {icon ? <div className="rounded-lg bg-mint/15 p-2 text-mint">{icon}</div> : null}
      </div>
    </Card>
  );
}
