"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6">
      <h1 className="mb-1 text-center text-2xl font-bold text-brand-700">医经刷题</h1>
      <p className="mb-8 text-center text-sm text-stone-500">中医经典 · 刷题 / 名词解释 / 模拟考试</p>
      <form className="card space-y-3" onSubmit={async e => {
        e.preventDefault();
        setBusy(true); setError("");
        const r = await fetch("/api/auth/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const d = await r.json().catch(() => ({}));
        setBusy(false);
        if (r.ok) router.replace("/banks");
        else setError(d.error || "登录失败");
      }}>
        <input className="input" placeholder="用户名" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
        <input className="input" type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "…" : "登 录"}</button>
        <p className="text-center text-sm text-stone-500">
          没有账号？<Link className="text-brand-600 underline" href="/register">注册</Link>
        </p>
      </form>
    </main>
  );
}
