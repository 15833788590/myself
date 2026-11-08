import { NextResponse } from "next/server";
import { clearSessionCookie, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const c = await import("next/headers").then(m => m.cookies());
  const token = c.get("quiz_session")?.value;
  if (token) db().prepare("delete from sessions where token=?").run(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
