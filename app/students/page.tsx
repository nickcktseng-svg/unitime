"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function StudentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/jobs");
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-6 text-ink dark:bg-[#111817] dark:text-white">
      <div className="grid max-w-sm gap-3 text-center">
        <h1 className="text-2xl font-black">學生已合併到工作</h1>
        <p className="text-sm text-ink/60 dark:text-white/60">家教學生和其他工作現在都在同一個工作頁管理。</p>
        <Link className="rounded-lg bg-ink px-4 py-3 text-sm font-black text-white dark:bg-paper dark:text-ink" href="/jobs">
          前往工作頁
        </Link>
      </div>
    </main>
  );
}
