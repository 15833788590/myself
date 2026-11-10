import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "参数错误" }, { status: 400 });
  const row = db().prepare("select idx from practice_state where user_id=? and key=?").get(u.id, key) as any;
  return NextResponse.json({ idx: row ? Number(row.idx) : null });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { key, idx } = (await req.json().catch(() => ({}))) as any;
  if (typeof key !== "string" || typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx > 100000)
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  db().prepare("insert into practice_state(user_id,key,idx,updated_at) values(?,?,?,?) on conflict(user_id,key) do update set idx=excluded.idx, updated_at=excluded.updated_at").run(u.id, key, idx, Date.now());
  return NextResponse.json({ ok: true });
}
