"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6">
      <h1 className="mb-8 text-center text-2xl font-bold text-brand-700">注册</h1>
      <form className="card space-y-3" onSubmit={async e => {
        e.preventDefault();
        if (password !== confirm) { setError("两次密码不一致"); return; }
        setBusy(true); setError("");
        const r = await fetch("/api/auth/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const d = await r.json().catch(() => ({}));
        setBusy(false);
        if (r.ok) router.replace("/banks");
        else setError(d.error || "注册失败");
      }}>
        <input className="input" placeholder="用户名（2-20位）" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="密码（至少4位）" value={password} onChange={e => setPassword(e.target.value)} />
        <input className="input" type="password" placeholder="确认密码" value={confirm} onChange={e => setConfirm(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "…" : "注 册"}</button>
        <p className="text-center text-sm text-stone-500">
          已有账号？<Link className="text-brand-600 underline" href="/login">登录</Link>
        </p>
      </form>
    </main>
  );
}
