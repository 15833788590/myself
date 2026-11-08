"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getJSON } from "@/lib/client";

export function useMe() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: number; username: string } | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/me").then(async r => {
      if (r.status === 401) {
        router.replace("/login");
        setUser(null);
      } else {
        const d = await r.json();
        setUser(d.user);
      }
    });
  }, [router]);
  return user;
}

export function NavBar({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-stone-200 bg-white/95 px-3 py-2.5 backdrop-blur">
      {back && (
        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => router.push(back)}>← 返回</button>
      )}
      <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
      {right}
    </header>
  );
}

export function LogoutButton() {
  return (
    <button className="text-xs text-stone-500 underline" onClick={async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      location.href = "/login";
    }}>退出</button>
  );
}
