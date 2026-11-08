import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "quiz_session";
const WEEK = 7 * 24 * 3600 * 1000;

export function hashPass(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

export function createUser(username: string, password: string): { ok: true } | { ok: false; error: string } {
  const d = db();
  const exist = d.prepare("select id from users where username=?").get(username);
  if (exist) return { ok: false, error: "用户名已存在" };
  const salt = randomBytes(16).toString("hex");
  d.prepare("insert into users(username,pass,salt,created_at) values(?,?,?,?)")
    .run(username, hashPass(password, salt), salt, Date.now());
  return { ok: true };
}

export function checkLogin(username: string, password: string): number | null {
  const d = db();
  const u = d.prepare("select id,pass,salt from users where username=?").get(username) as any;
  if (!u) return null;
  const h = Buffer.from(hashPass(password, u.salt), "hex");
  const g = Buffer.from(u.pass, "hex");
  if (h.length !== g.length || !timingSafeEqual(h, g)) return null;
  return u.id as number;
}

export function startSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  db().prepare("insert into sessions(token,user_id,expires) values(?,?,?)").run(token, userId, Date.now() + WEEK);
  return token;
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 3600, path: "/" });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<{ id: number; username: string } | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db().prepare(
    "select s.user_id,u.username from sessions s join users u on u.id=s.user_id where s.token=? and s.expires>?"
  ).get(token, Date.now()) as any;
  if (!row) return null;
  return { id: row.user_id, username: row.username };
}
