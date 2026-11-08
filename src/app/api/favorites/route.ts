import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = db().prepare("select qid from favorites where user_id=? order by created_at desc").all(u.id) as any[];
  return NextResponse.json({ favorites: rows.map(r => r.qid) });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { qid } = (await req.json().catch(() => ({}))) as any;
  if (typeof qid !== "string") return NextResponse.json({ error: "参数错误" }, { status: 400 });
  db().prepare("insert or ignore into favorites(user_id,qid,created_at) values(?,?,?)").run(u.id, qid, Date.now());
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { qid } = (await req.json().catch(() => ({}))) as any;
  if (typeof qid !== "string") return NextResponse.json({ error: "参数错误" }, { status: 400 });
  db().prepare("delete from favorites where user_id=? and qid=?").run(u.id, qid);
  return NextResponse.json({ ok: true });
}
