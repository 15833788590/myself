"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Star, Check, X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { NavBar, useMe } from "@/components/ui";
import { fetchBank, optionLabel, parseAnswerSet, shuffle, KIND_LABEL } from "@/lib/client";
import type { Bank, Question } from "@/lib/types";

type Mode = "seq" | "rand" | "unit" | "recite" | "wrong" | "fav";

function PracticeInner() {
  const { slug } = useParams<{ slug: string }>();
  const sp = useSearchParams();
  const mode = (sp.get("mode") || "seq") as Mode;
  const unitParam = sp.get("unit");
  const jump = sp.get("jump");
  const user = useMe();
  const [bank, setBank] = useState<Bank | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState<null | boolean>(null);
  const [showRef, setShowRef] = useState(false);
  const [draft, setDraft] = useState("");
  const orderRef = useRef<string | null>(null);
  const stateKey = `${slug}:${mode}:${unitParam ?? "all"}`;
  const triedRestore = useRef(false);
  const resumeReady = useRef(false);

  useEffect(() => { fetchBank(slug).then(setBank).catch(() => {}); }, [slug]);
  useEffect(() => {
    fetch("/api/progress").then(r => r.ok ? r.json() : { progress: {} }).then(d => setProgress(d.progress || {}));
    fetch("/api/favorites").then(r => r.ok ? r.json() : { favorites: [] }).then(d => setFavs(new Set<string>(d.favorites || [])));
  }, []);

  const list: Question[] = useMemo(() => {
    if (!bank) return [];
    let l = bank.questions;
    if (mode === "unit" && unitParam != null) l = l.filter(q => q.unit === Number(unitParam));
    if (mode === "wrong") l = l.filter(q => progress[q.id] === false);
    if (mode === "fav") l = l.filter(q => favs.has(q.id));
    if (mode === "rand") {
      if (!orderRef.current) {
        orderRef.current = "rand";
        l = shuffle(l);
      } else {
        const cache = sessionStorage.getItem(`order:${slug}:rand`);
        if (cache) {
          const map = new Map(l.map(q => [q.id, q]));
          const ordered = (JSON.parse(cache) as string[]).map(id => map.get(id)).filter(Boolean) as Question[];
          const rest = l.filter(q => !ordered.includes(q));
          return [...ordered, ...rest];
        }
        l = shuffle(l);
        sessionStorage.setItem(`order:${slug}:rand`, JSON.stringify(l.map(q => q.id)));
      }
    }
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, mode, unitParam, favs, progress]);

  useEffect(() => {
    if (jump && bank) {
      const i = bank.questions.findIndex(q => q.id === jump);
      if (i >= 0 && mode !== "rand" && mode !== "wrong" && mode !== "fav") {
        const ui = bank.questions[i].unit;
        const inUnit = bank.questions.filter(q => q.unit === ui).findIndex(q => q.id === jump);
        setIdx(inUnit >= 0 && mode === "unit" && Number(unitParam) === ui ? inUnit : Math.max(0, bank.questions.slice(0, i).filter(q => mode !== "unit" || q.unit === ui).length));
        if (mode === "seq") setIdx(i);
      }
    }
  }, [jump, bank, mode, unitParam]);

  useEffect(() => {
    if (triedRestore.current || !bank || list.length === 0) return;
    triedRestore.current = true;
    if (jump) { resumeReady.current = true; return; }
    fetch(`/api/state?key=` + encodeURIComponent(stateKey))
      .then(r => (r.ok ? r.json() : {}))
      .then((d: any) => {
        if (typeof d.idx === "number" && d.idx > 0 && d.idx < list.length) setIdx(d.idx);
        resumeReady.current = true;
      })
      .catch(() => { resumeReady.current = true; });
  }, [bank, list, jump, stateKey]);

  useEffect(() => {
    if (!resumeReady.current) return;
    fetch("/api/state", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: stateKey, idx }),
    });
  }, [idx, stateKey]);

  const q = list[idx];
  useEffect(() => { setPicked(new Set()); setChecked(null); setShowRef(false); setDraft(""); window.scrollTo(0, 0); }, [idx, q?.id]);

  const record = useCallback((qid: string, correct: boolean, m: string) => {
    setProgress(p => ({ ...p, [qid]: correct }));
    fetch("/api/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qid, correct, mode: m }),
    });
  }, []);

  const isChoice = q && (q.kind === "single" || q.kind === "multi");

  const check = () => {
    if (!q || !isChoice || picked.size === 0) return;
    const want = new Set(parseAnswerSet(q.answer));
    const got = new Set([...picked].map(i => optionLabel(q, i)));
    const ok = want.size === got.size && [...want].every(x => got.has(x));
    setChecked(ok);
    record(q.id, ok, mode === "recite" ? "recite" : "practice");
  };

  const toggleFav = () => {
    if (!q) return;
    const has = favs.has(q.id);
    setFavs(s => { const n = new Set(s); has ? n.delete(q.id) : n.add(q.id); return n; });
    fetch("/api/favorites", {
      method: has ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qid: q.id }),
    });
  };

  if (!user || !bank) return <div className="p-8 text-center text-stone-400">加载中…</div>;

  const title = mode === "recite" ? "背题模式"
    : mode === "rand" ? "随机练习"
    : mode === "wrong" ? "错题重刷"
    : mode === "fav" ? "收藏练习"
    : mode === "unit" && unitParam != null ? bank.unitTitles[Number(unitParam)] || "章节练习"
    : "顺序练习";

  if (!q) return (
    <main>
      <NavBar title={title} back={`/banks/${slug}`} />
      <div className="p-10 text-center text-stone-500">
        {mode === "wrong" ? "没有错题，太棒了！" : mode === "fav" ? "还没有收藏题目" : "全部题目已完成 🎉"}
        <div className="mt-4"><Link className="btn-primary" href={`/banks/${slug}`}>返回</Link></div>
      </div>
    </main>
  );

  const answered = q.id in progress;

  return (
    <main className="pb-24">
      <NavBar title={`${title} ${idx + 1}/${list.length}`} back={`/banks/${slug}`} right={
        <button onClick={toggleFav} aria-label="收藏">
          <Star size={20} className={favs.has(q.id) ? "fill-amber-400 text-amber-400" : "text-stone-400"} />
        </button>
      } />
      <div className="h-1 w-full bg-stone-200">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${((idx + 1) / list.length) * 100}%` }} />
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="badge bg-brand-100 text-brand-700">{KIND_LABEL[q.kind]}</span>
          <span className="badge bg-stone-100 text-stone-500">{bank.unitTitles[q.unit]}</span>
          <span className="badge bg-stone-100 text-stone-400">第{q.no}题</span>
          {mode === "recite" && <span className="badge bg-sky-100 text-sky-700">背题</span>}
          {answered && checked == null && mode !== "recite" && (
            <span className={`badge ${progress[q.id] ? "bg-brand-100 text-brand-700" : "bg-red-100 text-red-600"}`}>{progress[q.id] ? "上次答对" : "上次答错"}</span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-[15px] leading-7">{q.stem}</p>

        {isChoice ? (
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const label = optionLabel(q, i);
              const want = parseAnswerSet(q.answer).includes(label);
              const got = picked.has(i);
              let cls = "border-stone-200 bg-white";
              if (mode === "recite" || checked != null) {
                if (want) cls = "border-brand-500 bg-brand-50";
                else if (got) cls = "border-red-400 bg-red-50";
                else cls = "border-stone-200 bg-white opacity-70";
              } else if (got) cls = "border-brand-500 bg-brand-50";
              return (
                <button key={i} disabled={mode === "recite" || checked != null}
                  onClick={() => {
                    if (q.kind === "single") setPicked(new Set([i]));
                    else setPicked(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
                  }}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${cls}`}>
                  <span className="mt-0.5 shrink-0 font-semibold">{label}</span>
                  <span className="leading-6">{opt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {mode !== "recite" && checked == null && !showRef && (
              <textarea className="input min-h-24" placeholder="先自己作答（可不填），再点“参考答案”对照" value={draft} onChange={e => setDraft(e.target.value)} />
            )}
            {(mode === "recite" || showRef || checked != null) && (
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm leading-7 whitespace-pre-wrap">
                <div className="mb-1 text-xs font-semibold text-brand-700">参考答案</div>{q.answer || "（本题暂无参考答案）"}
              </div>
            )}
          </div>
        )}

        {checked != null && isChoice && (
          <div className={`rounded-xl p-3 text-sm font-medium ${checked ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-600"}`}>
            {checked ? "回答正确" : `回答错误，正确答案：${q.answer}`}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-2xl border-t border-stone-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <button className="btn-ghost !px-2" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}><ChevronLeft size={18} /></button>
          {mode === "recite" ? (
            <button className="btn-primary flex-1" onClick={() => setIdx(i => Math.min(list.length - 1, i + 1))}>下一题</button>
          ) : isChoice ? (
            checked == null
              ? <button className="btn-primary flex-1" onClick={check} disabled={picked.size === 0}>确 认</button>
              : <button className="btn-primary flex-1" onClick={() => setIdx(i => Math.min(list.length - 1, i + 1))}>下一题 <ChevronRight size={16} /></button>
          ) : (
            showRef || checked != null ? (
              <div className="flex flex-1 gap-2">
                <button className="btn flex-1 border border-red-200 bg-red-50 text-red-600" onClick={() => { record(q.id, false, "self"); setIdx(i => Math.min(list.length - 1, i + 1)); }}>未掌握</button>
                <button className="btn flex-1 bg-brand-600 text-white" onClick={() => { record(q.id, true, "self"); setIdx(i => Math.min(list.length - 1, i + 1)); }}>记住了</button>
              </div>
            ) : (
              <button className="btn-primary flex-1" onClick={() => setShowRef(true)}><Eye size={16} /> 看参考答案</button>
            )
          )}
          <button className="btn-ghost !px-2" onClick={() => setIdx(i => Math.min(list.length - 1, i + 1))}><ChevronRight size={18} /></button>
        </div>
      </div>
    </main>
  );
}

export default function PracticePage() {
  return <Suspense fallback={<div className="p-8 text-center text-stone-400">加载中…</div>}><PracticeInner /></Suspense>;
}
