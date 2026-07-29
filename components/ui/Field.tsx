import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  children,
  error
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-ink/80 dark:text-white/80">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

const inputClass =
  "min-h-10 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none ring-mint/30 transition focus:ring-4 dark:border-white/15 dark:bg-black/20 dark:text-white";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${props.className ?? ""}`} {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${inputClass} ${props.className ?? ""}`} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-24 ${props.className ?? ""}`} {...props} />;
}
