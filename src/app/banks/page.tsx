"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Library, ChevronRight } from "lucide-react";
import { NavBar, useMe, LogoutButton } from "@/components/ui";
import type { BankMeta } from "@/lib/types";

export default function BanksPage() {
  const user = useMe();
  const [banks, setBanks] = useState<BankMeta[]>([]);
  useEffect(() => {
    fetch("/api/banks").then(r => r.json()).then(d => setBanks(d.banks || []));
  }, []);
  if (!user) return <div className="p-8 text-center text-stone-400">加载中…</div>;
  return (
    <main>
      <NavBar title="题库" right={<LogoutButton />} />
      <div className="space-y-3 p-4">
        {banks.map(b => (
          <Link key={b.slug} href={`/banks/${b.slug}`} className="card flex items-center gap-3">
            <span className="rounded-lg bg-brand-100 p-2 text-brand-700"><Library size={22} /></span>
            <span className="flex-1">
              <span className="block font-semibold">{b.title}</span>
              <span className="block text-xs text-stone-500">
                {(["单选", "多选", "简答", "论述", "术语"] as const).map((label, i) => {
                  const v = [b.counts.single, b.counts.multi, b.counts.short, b.counts.essay, b.counts.terms][i];
                  return v > 0 ? `${label}${v}` : null;
                }).filter(Boolean).join(" · ")}
                 · {b.unitTitles.length} 个章节
              </span>
            </span>
            <ChevronRight size={18} className="text-stone-400" />
          </Link>
        ))}
        <p className="px-1 pt-2 text-xs text-stone-400">新题库：将解析好的 JSON 放入 data/banks/ 即可自动出现。</p>
      </div>
    </main>
  );
}
