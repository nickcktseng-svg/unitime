import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniTime 大學生時間與打工管理",
  description: "課表、家教、打工與薪資管理網站原型"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
