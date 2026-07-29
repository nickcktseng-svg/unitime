"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.replace("/dashboard");
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-6 text-center text-ink dark:bg-[#111817] dark:text-white">
      <div>
        <p className="text-2xl font-black">UniTime</p>
        <p className="mt-2 text-sm text-ink/60 dark:text-white/60">正在前往儀表板...</p>
        <Link className="mt-4 inline-flex rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white dark:bg-paper dark:text-ink" href="/dashboard">
          開啟儀表板
        </Link>
      </div>
    </main>
  );
}
