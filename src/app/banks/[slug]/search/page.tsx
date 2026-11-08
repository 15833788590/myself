"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NavBar, useMe } from "@/components/ui";
import { fetchBank, KIND_LABEL } from "@/lib/client";
import type { Bank } from "@/lib/types";

type Hit =
  | { kind: "q"; id: string; unit: number; title: string; stem: string; answer: string; qkind: string }
  | { kind: "term"; id: string; unit: number; title: string; term: string; definition: string }
  | { kind: "recital"; unit: number; title: string; text: string };

export default function SearchPage() {
  const { slug } = useParams<{ slug: string }>();
  const user = useMe();
  const [bank, setBank] = useState<Bank | null>(null);
  const [kw, setKw] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => { fetchBank(slug).then(setBank).catch(() => {}); }, [slug]);

  const hits: Hit[] = useMemo(() => {
    if (!bank || !kw.trim()) return [];
    const k = kw.trim();
    const out: Hit[] = [];
    for (const q of bank.questions) {
      if (q.stem.includes(k) || q.answer.includes(k) || q.options.some(o => o.includes(k))) {
        out.push({ kind: "q", id: q.id, unit: q.unit, title: bank.unitTitles[q.unit], stem: q.stem, answer: q.answer, qkind: q.kind });
      }
    }
    for (const t of bank.terms) {
      if (t.term.includes(k) || t.definition.includes(k)) {
        out.push({ kind: "term", id: t.id, unit: t.unit, title: bank.unitTitles[t.unit], term: t.term, definition: t.definition });
      }
    }
    bank.recital.forEach((r, ri) => {
      r.passages.forEach((p, pi) => {
        if (p.includes(k)) out.push({ kind: "recital", unit: ri, title: r.unit, text: p });
      });
    });
    return out.slice(0, 200);
  }, [bank, kw]);

  function mark(s: string) {
    const k = kw.trim();
    if (!k) return s;
    const parts = s.split(k);
    return parts.flatMap((p, i) => i === 0 ? [p] : [<mark key={i} className="rounded bg-amber-200 px-0.5">{k}</mark>, p]);
  }

  if (!user) return <div className="p-8 text-center text-stone-400">加载中…</div>;
  return (
    <main>
      <NavBar title="搜索" back={`/banks/${slug}`} />
      <div className="p-3">
        <input autoFocus className="input" placeholder="搜索题目、解析、名词术语、背诵原文…" value={kw} onChange={e => setKw(e.target.value)} />
        {kw && <p className="mt-2 text-xs text-stone-500">{bank ? `找到 ${hits.length} 条结果${hits.length >= 200 ? "（已截断）" : ""}` : "题库加载中…"}</p>}
      </div>
      <div className="space-y-2 px-3 pb-8">
        {hits.map((h, i) => {
          const key = `${h.kind}-${i}`;
          const opened = open.has(key);
          return (
            <div key={key} className="card !p-3">
              <button className="flex w-full items-start gap-2 text-left" onClick={() => setOpen(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; })}>
                <span className="badge mt-0.5 shrink-0 bg-stone-100 text-stone-500">
                  {h.kind === "q" ? KIND_LABEL[h.qkind] || "题目" : h.kind === "term" ? "术语" : "原文"}
                </span>
                <span className="min-w-0 flex-1 text-sm leading-6">
                  {h.kind === "q" && mark(h.stem)}
                  {h.kind === "term" && <b>{mark(h.term)}</b>}
                  {h.kind === "recital" && mark(h.text.slice(0, 60) + (h.text.length > 60 ? "…" : ""))}
                </span>
                <span className="shrink-0 text-xs text-stone-400">{h.unit >= 0 && (h.kind === "recital" ? h.title : h.title.slice(0, 8))}</span>
              </button>
              {opened && (
                <div className="mt-2 space-y-2 border-t border-stone-100 pt-2 text-sm leading-7">
                  {h.kind === "q" && (
                    <>
                      <p className="whitespace-pre-wrap">{mark(h.stem)}</p>
                      {h.answer && <div className="rounded-lg bg-brand-50 p-2 whitespace-pre-wrap"><span className="text-xs font-semibold text-brand-700">答案 </span>{mark(h.answer)}</div>}
                      <Link className="text-xs text-sky-600 underline" href={`/banks/${slug}/practice?jump=${encodeURIComponent(h.id)}&mode=unit&unit=${h.unit}`}>去本单元练习 →</Link>
                    </>
                  )}
                  {h.kind === "term" && (
                    <>
                      <p><b>{mark(h.term)}</b></p>
                      <div className="rounded-lg bg-brand-50 p-2"><span className="text-xs font-semibold text-brand-700">解释 </span>{mark(h.definition)}</div>
                    </>
                  )}
                  {h.kind === "recital" && <p className="whitespace-pre-wrap">{mark(h.text)}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
