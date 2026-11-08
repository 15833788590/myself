import { NextResponse } from "next/server";
import { checkLogin, createUser, startSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  if (typeof username !== "string" || typeof password !== "string")
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  const u = username.trim();
  if (!/^[A-Za-z0-9_\u4e00-\u9fa5]{2,20}$/.test(u))
    return NextResponse.json({ error: "用户名需为2-20位字母、数字、下划线或中文" }, { status: 400 });
  if (password.length < 4)
    return NextResponse.json({ error: "密码至少4位" }, { status: 400 });
  const r = createUser(u, password);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  const id = (db().prepare("select id from users where username=?").get(u) as any).id;
  const token = startSession(id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, username: u });
}
