import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "医经刷题",
  description: "中医经典题库 · 刷题 · 名词解释 · 模考",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto min-h-dvh max-w-2xl">{children}</div>
      </body>
    </html>
  );
}
