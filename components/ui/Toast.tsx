"use client";

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed right-4 top-4 z-[60] rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft dark:bg-paper dark:text-ink">
      {message}
    </div>
  );
}
