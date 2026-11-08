import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = db().prepare(
    "select id,bank,correct,total,score,duration,created_at from exams where user_id=? order by created_at desc limit 50"
  ).all(u.id);
  return NextResponse.json({ exams: rows });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as any;
  const { bank, correct, total, duration, detail } = body;
  if (typeof bank !== "string" || typeof correct !== "number" || typeof total !== "number" || total <= 0)
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  const score = Math.round((correct / total) * 100);
  const r = db().prepare(
    "insert into exams(user_id,bank,correct,total,score,duration,created_at,detail) values(?,?,?,?,?,?,?,?)"
  ).run(u.id, bank, correct, total, score, Math.max(0, Math.round(duration || 0)), Date.now(), JSON.stringify(detail || []));
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid), score });
}
