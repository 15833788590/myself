"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/me").then(r => router.replace(r.ok ? "/banks" : "/login"));
  }, [router]);
  return <div className="p-8 text-center text-stone-400">加载中…</div>;
}
