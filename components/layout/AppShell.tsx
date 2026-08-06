"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Moon,
  Settings,
  Sun
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAppData } from "@/hooks/useAppData";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Toast } from "@/components/ui/Toast";

const navItems = [
  { href: "/dashboard", label: "儀表板", icon: LayoutDashboard },
  { href: "/calendar", label: "行事曆", icon: CalendarDays },
  { href: "/courses", label: "課表", icon: GraduationCap },
  { href: "/jobs", label: "工作", icon: BriefcaseBusiness },
  { href: "/income", label: "薪資", icon: BarChart3 },
  { href: "/settings", label: "設定", icon: Settings }
];

export function AppShell({ children }: { children: (context: ReturnType<typeof useAppData>) => ReactNode }) {
  const pathname = usePathname();
  const appData = useAppData();
  const [collapsed, setCollapsed] = useState(false);

  if (!appData.isLoaded) return <LoadingState />;

  const pageTitle = navItems.find((item) => pathname.startsWith(item.href))?.label ?? "UniTime";
  const isDark = appData.data.settings.theme === "dark";

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-[#111817] dark:text-white">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-ink/10 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-black/20 lg:block ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            {!collapsed ? (
              <div>
                <p className="text-xl font-black">UniTime</p>
                <p className="text-xs font-semibold text-ink/55 dark:text-white/55">時間與打工管理</p>
              </div>
            ) : (
              <p className="mx-auto text-xl font-black">U</p>
            )}
            <Button title="收合側邊欄" aria-label="收合側邊欄" variant="ghost" onClick={() => setCollapsed(!collapsed)}>
              <Menu size={18} />
            </Button>
          </div>
          <nav className="mt-8 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                    active ? "bg-ink text-white dark:bg-paper dark:text-ink" : "hover:bg-ink/8 dark:hover:bg-white/10"
                  } ${collapsed ? "justify-center" : ""}`}
                  title={item.label}
                >
                  <Icon size={18} />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-lg bg-mint/12 p-3 text-sm">
            {!collapsed ? (
              <>
                <p className="font-black">{appData.data.settings.userName}</p>
                <p className="mt-1 text-ink/60 dark:text-white/60">{appData.data.settings.schoolName}</p>
              </>
            ) : (
              <p className="text-center font-black">{appData.data.settings.userName.slice(0, 1)}</p>
            )}
          </div>
        </div>
      </aside>
      <main className={`${collapsed ? "lg:pl-20" : "lg:pl-72"} pb-24 transition-[padding] lg:pb-0`}>
        <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#111817]/90 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-ink/55 dark:text-white/55">UniTime 大學生時間與打工管理</p>
              <h1 className="text-2xl font-black">{pageTitle}</h1>
            </div>
            <Button
              title={isDark ? "切換淺色模式" : "切換深色模式"}
              aria-label={isDark ? "切換淺色模式" : "切換深色模式"}
              variant="secondary"
              onClick={() =>
                appData.actions.updateSettings({
                  ...appData.data.settings,
                  theme: isDark ? "light" : "dark"
                })
              }
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-6">{children(appData)}</div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-ink/10 bg-white/95 px-2 py-2 backdrop-blur dark:border-white/10 dark:bg-[#111817]/95 lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`grid min-h-12 place-items-center rounded-lg text-[11px] font-bold ${
                active ? "bg-ink text-white dark:bg-paper dark:text-ink" : "text-ink/65 dark:text-white/65"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <Toast message={appData.toast} />
    </div>
  );
}
