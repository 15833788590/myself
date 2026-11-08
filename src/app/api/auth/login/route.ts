import { NextResponse } from "next/server";
import { checkLogin, setSessionCookie, startSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  if (typeof username !== "string" || typeof password !== "string")
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  const id = checkLogin(username.trim(), password);
  if (id == null) return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  const token = startSession(id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, username });
}
