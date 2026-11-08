"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NavBar, useMe } from "@/components/ui";
import { fetchBank } from "@/lib/client";
import type { Bank } from "@/lib/types";

export default function RecitalPage() {
  const { slug } = useParams<{ slug: string }>();
  const user = useMe();
  const [bank, setBank] = useState<Bank | null>(null);
  const [ui, setUi] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => { fetchBank(slug).then(setBank).catch(() => {}); }, [slug]);
  if (!user || !bank) return <div className="p-8 text-center text-stone-400">加载中…</div>;
  const group = bank.recital[ui];
  return (
    <main className="pb-10">
      <NavBar title="背诵原文" back={`/banks/${slug}`}
        right={<button className="text-xs text-sky-600" onClick={() => setHidden(h => !h)}>{hidden ? "显示" : "遮挡"}</button>} />
      <div className="flex flex-wrap gap-1.5 p-3 text-xs">
        {bank.recital.map((r, i) => (
          <button key={i} className={`badge ${ui === i ? "bg-brand-600 text-white" : "border border-stone-300 bg-white text-stone-600"}`} onClick={() => setUi(i)}>{r.unit}</button>
        ))}
      </div>
      {group ? (
        <div className="space-y-3 px-3">
          {group.passages.map((p, i) => (
            <div key={i} className="card text-sm leading-7">
              <div className="mb-1 text-xs text-stone-400">{i + 1}</div>
              <p className={hidden ? "select-none blur-sm" : ""}>{p}</p>
            </div>
          ))}
        </div>
      ) : <p className="p-8 text-center text-sm text-stone-500">本题库暂无背诵原文</p>}
    </main>
  );
}
