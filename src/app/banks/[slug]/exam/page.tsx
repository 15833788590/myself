"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavBar, useMe } from "@/components/ui";
import { fetchBank, fmtTime, optionLabel, parseAnswerSet, shuffle } from "@/lib/client";
import type { Bank, Question } from "@/lib/types";

type Phase = "setup" | "running" | "result";

export default function ExamPage() {
  const { slug } = useParams<{ slug: string }>();
  const user = useMe();
  const [bank, setBank] = useState<Bank | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(30);
  const [minutes, setMinutes] = useState(30);
  const [onlyChoice, setOnlyChoice] = useState(true);
  const [qs, setQs] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Set<number>>>({});
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<{ correct: number; total: number; wrongIds: string[] } | null>(null);
  const startedAt = useRef(0);
  const submitted = useRef(false);

  useEffect(() => { fetchBank(slug).then(setBank).catch(() => {}); }, [slug]);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => {
      setLeft(l => {
        if (l <= 1) { clearInterval(timer); submit(); return 0; }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const pool = useMemo(() => {
    if (!bank) return [];
    return onlyChoice ? bank.questions.filter(q => q.kind === "single" || q.kind === "multi") : bank.questions;
  }, [bank, onlyChoice]);

  const start = () => {
    const picked = shuffle(pool).slice(0, Math.min(count, pool.length));
    setQs(picked);
    setAnswers({});
    setResult(null);
    submitted.current = false;
    startedAt.current = Date.now();
    setLeft(minutes * 60);
    setPhase("running");
  };

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    let correct = 0;
    const detail: any[] = [];
    for (const q of qs) {
      const got = answers[q.id] || new Set<number>();
      const want = new Set(parseAnswerSet(q.answer).map(l => {
        const ci = ["A","B","C","D","E","①","②","③","④","⑤"].indexOf(l);
        return ci >= 5 ? ci - 5 : ci;
      }));
      const ok = want.size > 0 && got.size === want.size && [...want].every(i => got.has(i));
      if (ok) correct++;
      detail.push({ qid: q.id, ok });
      fetch("/api/progress", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qid: q.id, correct: ok, mode: "exam" }),
      });
    }
    const duration = Math.round((Date.now() - startedAt.current) / 1000);
    fetch("/api/exams", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bank: slug, correct, total: qs.length, duration, detail }),
    });
    setResult({ correct, total: qs.length, wrongIds: detail.filter(d => !d.ok).map(d => d.qid) });
    setPhase("result");
  }, [qs, answers, slug]);

  if (!user || !bank) return <div className="p-8 text-center text-stone-400">加载中…</div>;

  if (phase === "setup") return (
    <main>
      <NavBar title="模拟考试" back={`/banks/${slug}`} />
      <div className="space-y-4 p-4">
        <div className="card space-y-3">
          <div>
            <div className="mb-1 text-sm font-medium">题目数量（当前可抽 {pool.length} 题）</div>
            <div className="flex gap-2">
              {[10, 20, 30, 50, 100].map(n => (
                <button key={n} className={`badge ${count === n ? "bg-brand-600 text-white" : "border border-stone-300 bg-white text-stone-600"}`} onClick={() => setCount(n)}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">考试时长（分钟）</div>
            <div className="flex gap-2">
              {[10, 20, 30, 45, 60, 90].map(n => (
                <button key={n} className={`badge ${minutes === n ? "bg-brand-600 text-white" : "border border-stone-300 bg-white text-stone-600"}`} onClick={() => setMinutes(n)}>{n}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyChoice} onChange={e => setOnlyChoice(e.target.checked)} />
            只考客观题（单选/多选）
          </label>
          <p className="text-xs text-stone-400">含主观题时，简答/论述按“查看参考答案后自评”无法自动计分，建议勾选。交卷后多选题按全对得分。</p>
        </div>
        <button className="btn-primary w-full py-3" onClick={start} disabled={pool.length === 0}>开始考试</button>
      </div>
    </main>
  );

  if (phase === "running") {
    const answeredCount = Object.values(answers).filter(s => s.size > 0).length;
    return (
      <main className="pb-20">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-stone-200 bg-white/95 px-3 py-2.5 backdrop-blur">
          <span className={`text-lg font-bold tabular-nums ${left < 60 ? "text-red-600" : "text-brand-700"}`}>{fmtTime(left)}</span>
          <span className="flex-1 text-center text-xs text-stone-500">已答 {answeredCount}/{qs.length}</span>
          <button className="btn-primary !py-1 text-xs" onClick={submit}>交 卷</button>
        </div>
        <div className="space-y-4 p-4">
          {qs.map((q, qi) => {
            const got = answers[q.id] || new Set<number>();
            return (
              <div key={q.id} className="card space-y-2">
                <p className="text-sm leading-6"><span className="mr-1 font-semibold">{qi + 1}.</span>{q.stem}</p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const sel = got.has(oi);
                    return (
                      <button key={oi} onClick={() => setAnswers(a => {
                        const cur = new Set(a[q.id] || []);
                        if (q.kind === "single") { if (!cur.has(oi)) { cur.clear(); cur.add(oi); } }
                        else { cur.has(oi) ? cur.delete(oi) : cur.add(oi); }
                        return { ...a, [q.id]: cur };
                      })}
                        className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-sm ${sel ? "border-brand-500 bg-brand-50" : "border-stone-200"}`}>
                        <span className="font-semibold">{optionLabel(q, oi)}</span><span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  const r = result!;
  const score = Math.round((r.correct / r.total) * 100);
  const wrongs = (r.wrongIds || []).map(id => bank.questions.find(q => q.id === id)).filter(Boolean) as Question[];
  return (
    <main className="pb-10">
      <NavBar title="考试结果" back={`/banks/${slug}`} />
      <div className="p-4">
        <div className="card text-center">
          <div className={`text-5xl font-bold ${score >= 60 ? "text-brand-600" : "text-red-600"}`}>{score}</div>
          <div className="mt-1 text-sm text-stone-500">答对 {r.correct} / {r.total} · 用时 {fmtTime(minutes * 60 - left)}</div>
        </div>
        <h2 className="mb-2 mt-5 text-sm font-semibold text-stone-600">错题回顾</h2>
        {wrongs.length === 0 ? <p className="text-sm text-stone-500">全对，无错题 🎉</p> : (
          <div className="space-y-2">
            {wrongs.map(q => (
              <div key={q.id} className="card text-sm">
                <p className="leading-6">{q.stem}</p>
                <p className="mt-1 text-brand-700">正确答案：{q.answer}</p>
                <Link className="mt-2 inline-block text-xs text-sky-600 underline" href={`/banks/${slug}/practice?jump=${encodeURIComponent(q.id)}&mode=unit&unit=${q.unit}`}>去练这道题所在的单元 →</Link>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex gap-2">
          <button className="btn-primary flex-1" onClick={() => { setPhase("setup"); }}>再考一次</button>
          <Link className="btn-ghost flex-1" href={`/banks/${slug}`}>返回</Link>
        </div>
      </div>
    </main>
  );
}
