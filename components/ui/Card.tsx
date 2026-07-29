import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-ink/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] ${className}`}
      {...props}
    />
  );
}
