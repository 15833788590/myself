"use client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { NavBar, useMe } from "@/components/ui";
import { fetchBank, shuffle } from "@/lib/client";
import type { Bank } from "@/lib/types";

export default function TermsPage() {
  const { slug } = useParams<{ slug: string }>();
  const user = useMe();
  const [bank, setBank] = useState<Bank | null>(null);
  const [unit, setUnit] = useState<number>(-1);
  const [rand, setRand] = useState(false);
  const [order, setOrder] = useState(0);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => { fetchBank(slug).then(setBank).catch(() => {}); }, [slug]);
  useEffect(() => {
    fetch("/api/progress").then(r => r.ok ? r.json() : { progress: {} }).then(d => setProgress(d.progress || {}));
  }, []);

  const list = useMemo(() => {
    if (!bank) return [];
    let l = bank.terms;
    if (unit >= 0) l = l.filter(t => t.unit === unit);
    if (rand) {
      const key = `order:${slug}:terms:${unit}:${order}`;
      const cache = sessionStorage.getItem(key);
      if (cache) {
        const map = new Map(l.map(t => [t.id, t]));
        const ord = (JSON.parse(cache) as string[]).map(id => map.get(id)).filter(Boolean) as typeof l;
        return [...ord, ...l.filter(t => !ord.includes(t))];
      }
      l = shuffle(l);
      sessionStorage.setItem(key, JSON.stringify(l.map(t => t.id)));
    }
    return l;
  }, [bank, unit, rand, order, slug]);

  useEffect(() => { setDraft(""); setRevealed(false); setIdx(0); }, [unit, rand, order]);
  useEffect(() => { setDraft(""); setRevealed(false); window.scrollTo(0, 0); }, [idx]);

  if (!user || !bank) return <div className="p-8 text-center text-stone-400">加载中…</div>;
  const t = list[idx];
  const doneCount = list.filter(x => x.id in progress).length;

  const rate = (known: boolean) => {
    if (!t) return;
    setProgress(p => ({ ...p, [t.id]: known }));
    fetch("/api/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qid: t.id, correct: known, mode: "term" }),
    });
    setIdx(i => Math.min(list.length - 1, i + 1));
  };

  return (
    <main className="pb-24">
      <NavBar title={`名词解释 ${list.length ? idx + 1 : 0}/${list.length}`} back={`/banks/${slug}`}
        right={<span className="text-xs text-stone-500">完成 {doneCount}</span>} />
      <div className="flex flex-wrap gap-1.5 p-3 text-xs">
        <button className={`badge ${unit === -1 ? "bg-brand-600 text-white" : "bg-white border border-stone-300 text-stone-600"}`} onClick={() => setUnit(-1)}>全部</button>
        {bank.unitTitles.map((ut, ui) => (
          <button key={ui} className={`badge ${unit === ui ? "bg-brand-600 text-white" : "bg-white border border-stone-300 text-stone-600"}`} onClick={() => setUnit(ui)}>
            {ut.replace(/^第[一二三四五六七八九]+单元\s*/, "").replace(/^绪论$/, "绪论")}
          </button>
        ))}
        <button className={`badge ${rand ? "bg-sky-600 text-white" : "bg-white border border-stone-300 text-stone-600"}`}
          onClick={() => { setRand(r => !r); setOrder(o => o + 1); }}>随机</button>
      </div>
      {!t ? (
        <div className="p-10 text-center text-stone-500">本组术语已全部出现在这里 🎉</div>
      ) : (
        <div className="space-y-3 p-4">
          <div className="card text-center">
            <div className="text-xs text-stone-400">请默写下列名词的解释</div>
            <div className="mt-2 text-2xl font-bold tracking-wide">{t.term}</div>
            <div className="mt-1 text-xs text-stone-400">{bank.unitTitles[t.unit]}</div>
          </div>
          {!revealed ? (
            <>
              <textarea className="input min-h-28" placeholder="写下你记忆中的解释（可不写，直接看答案）" value={draft} onChange={e => setDraft(e.target.value)} />
              <button className="btn-primary w-full" onClick={() => setRevealed(true)}>查看标准解释</button>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm leading-7 whitespace-pre-wrap">
                <div className="mb-1 text-xs font-semibold text-brand-700">标准解释</div>{t.definition}
              </div>
              {draft && (
                <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm leading-7 text-stone-500 whitespace-pre-wrap">
                  <div className="mb-1 text-xs font-semibold">我的默写</div>{draft}
                </div>
              )}
              <div className="flex gap-2">
                <button className="btn flex-1 border border-red-200 bg-red-50 text-red-600" onClick={() => rate(false)}>未掌握</button>
                <button className="btn flex-1 bg-brand-600 text-white" onClick={() => rate(true)}>记住了</button>
              </div>
            </>
          )}
          {revealed && (
            <div className="flex justify-between">
              <button className="btn-ghost" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>上一条</button>
              <button className="btn-ghost" onClick={() => setIdx(i => Math.min(list.length - 1, i + 1))} disabled={idx >= list.length - 1}>跳过</button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
