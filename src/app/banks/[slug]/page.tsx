"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ListOrdered, Shuffle, BookOpen, FileQuestion, ScrollText, Star, Search as SearchIcon, Feather, ClipboardList,
} from "lucide-react";
import { NavBar, useMe } from "@/components/ui";
import { fetchBank } from "@/lib/client";
import type { Bank } from "@/lib/types";

export default function BankHome() {
  const { slug } = useParams<{ slug: string }>();
  const user = useMe();
  const [bank, setBank] = useState<Bank | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [favs, setFavs] = useState<string[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  useEffect(() => { fetchBank(slug).then(setBank).catch(() => {}); }, [slug]);
  useEffect(() => {
    if (!user) return;
    fetch("/api/progress").then(r => r.ok ? r.json() : { progress: {} }).then(d => setProgress(d.progress || {}));
    fetch("/api/favorites").then(r => r.ok ? r.json() : { favorites: [] }).then(d => setFavs(d.favorites || {}));
    fetch("/api/exams").then(r => r.ok ? r.json() : { exams: [] }).then(d => setExams(d.exams || {}));
  }, [user]);

  const stats = useMemo(() => {
    if (!bank) return null;
    const ids = new Set([...bank.questions.map(q => q.id), ...bank.terms.map(t => t.id)]);
    const done = [...ids].filter(id => id in progress).length;
    const wrong = [...ids].filter(id => progress[id] === false).length;
    const favBank = favs.filter(f => f.startsWith(slug + ":")).length;
    return { total: ids.size, done, wrong, favBank };
  }, [bank, progress, favs, slug]);

  const unitStats = useMemo(() => {
    if (!bank) return [];
    return bank.unitTitles.map((title, ui) => {
      const ids = [
        ...bank.questions.filter(q => q.unit === ui).map(q => q.id),
        ...bank.terms.filter(t => t.unit === ui).map(t => t.id),
      ];
      const done = ids.filter(id => id in progress).length;
      const wrong = ids.filter(id => progress[id] === false).length;
      return { ui, title, total: ids.length, done, wrong };
    });
  }, [bank, progress]);

  if (!user || !bank || !stats) return <div className="p-8 text-center text-stone-400">加载中…</div>;

  const modes = [
    { href: `/banks/${slug}/practice?mode=seq`, icon: ListOrdered, label: "顺序练习", desc: `${stats.total} 题按题库顺序` },
    { href: `/banks/${slug}/practice?mode=rand`, icon: Shuffle, label: "随机练习", desc: "全库乱序抽题" },
    { href: `/banks/${slug}/practice?mode=wrong`, icon: ClipboardList, label: "错题重刷", desc: `${stats.wrong} 道错题` },
    { href: `/banks/${slug}/practice?mode=recite`, icon: BookOpen, label: "背题模式", desc: "直接显示答案" },
    { href: `/banks/${slug}/exam`, icon: FileQuestion, label: "模拟考试", desc: "计时计分" },
    { href: `/banks/${slug}/terms`, icon: Feather, label: "名词解释", desc: `默写术语 ${bank.counts.terms} 条` },
    { href: `/banks/${slug}/search`, icon: SearchIcon, label: "搜索", desc: "题目 / 解析 / 术语 / 原文" },
    { href: `/banks/${slug}/recital`, icon: ScrollText, label: "背诵原文", desc: `${bank.recital.length} 组原文` },
  ];

  return (
    <main>
      <NavBar title={bank.title} back="/banks" right={<span className="text-xs text-stone-500">{user.username}</span>} />
      <div className="grid grid-cols-3 gap-2 p-4 pb-0">
        <div className="card !p-3 text-center"><div className="text-lg font-bold text-brand-700">{stats.done}/{stats.total}</div><div className="text-xs text-stone-500">已作答</div></div>
        <div className="card !p-3 text-center"><div className="text-lg font-bold text-red-600">{stats.wrong}</div><div className="text-xs text-stone-500">错题</div></div>
        <div className="card !p-3 text-center"><div className="text-lg font-bold text-amber-500">{stats.favBank}</div><div className="text-xs text-stone-500">收藏</div></div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4">
        {modes.map(m => (
          <Link key={m.href} href={m.href} className="card flex items-center gap-3">
            <span className="rounded-lg bg-brand-50 p-2 text-brand-600"><m.icon size={20} /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="block truncate text-xs text-stone-500">{m.desc}</span>
            </span>
          </Link>
        ))}
      </div>
      <section className="px-4 pb-4">
        <h2 className="mb-2 text-sm font-semibold text-stone-600">按章节练习</h2>
        <div className="space-y-2">
          {unitStats.map(u => (
            <Link key={u.ui} href={`/banks/${slug}/practice?mode=unit&unit=${u.ui}`} className="card flex items-center gap-3 !py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{u.title}</span>
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded bg-stone-100">
                  <span className="block h-full rounded bg-brand-500" style={{ width: `${u.total ? (u.done / u.total) * 100 : 0}%` }} />
                </span>
              </span>
              <span className="shrink-0 text-xs text-stone-500">{u.done}/{u.total}{u.wrong > 0 && <span className="ml-1 text-red-500">错{u.wrong}</span>}</span>
            </Link>
          ))}
        </div>
      </section>
      {exams.length > 0 && (
        <section className="px-4 pb-6">
          <h2 className="mb-2 text-sm font-semibold text-stone-600">最近模考</h2>
          <div className="card divide-y divide-stone-100 !p-0">
            {exams.slice(0, 5).map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <Star size={14} className="text-stone-300" />
                <span className="flex-1 text-stone-500">{new Date(e.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="text-xs text-stone-500">{e.correct}/{e.total}</span>
                <span className={`font-bold ${e.score >= 60 ? "text-brand-600" : "text-red-600"}`}>{e.score}分</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
