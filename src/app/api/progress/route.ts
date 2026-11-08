import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = db().prepare(
    `select a.qid, a.correct from answers a
     join (select qid, max(id) mid from answers where user_id=? group by qid) t
     on a.id = t.mid where a.user_id=?`
  ).all(u.id, u.id) as any[];
  const map: Record<string, boolean> = {};
  for (const r of rows) map[r.qid] = !!r.correct;
  return NextResponse.json({ progress: map });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { qid, correct, mode } = body as any;
  if (typeof qid !== "string" || typeof correct !== "boolean" || typeof mode !== "string")
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  db().prepare("insert into answers(user_id,qid,correct,mode,created_at) values(?,?,?,?,?)")
    .run(u.id, qid, correct ? 1 : 0, mode.slice(0, 20), Date.now());
  return NextResponse.json({ ok: true });
}
