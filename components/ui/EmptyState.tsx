import { Inbox } from "lucide-react";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-ink/20 p-6 text-center dark:border-white/20">
      <div>
        <Inbox className="mx-auto mb-3 text-ink/40 dark:text-white/40" size={30} />
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{body}</p>
      </div>
    </div>
  );
}
