"use client";
import type { Bank, Question, Term } from "./types";

const bankCache: Record<string, Promise<Bank>> = {};

export function fetchBank(slug: string): Promise<Bank> {
  if (!bankCache[slug]) {
    bankCache[slug] = fetch(`/api/banks/${slug}`).then(r => {
      if (!r.ok) throw new Error("bank not found");
      return r.json().then(d => d.bank as Bank);
    });
  }
  return bankCache[slug];
}

export async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  return r;
}

export async function getJSON<T>(path: string): Promise<T | null> {
  const r = await fetch(path);
  if (!r.ok) return null;
  return r.json();
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const KIND_LABEL: Record<string, string> = {
  single: "单选", multi: "多选", short: "简答", essay: "论述",
};

export function letters(i: number) {
  return ["A", "B", "C", "D", "E", "F"][i] || String(i + 1);
}

export function circled(i: number) {
  return ["①", "②", "③", "④", "⑤", "⑥"][i] || String(i + 1);
}

export function optionLabel(q: Question, i: number) {
  return q.kind === "multi" && (q.labelStyle ?? "circled") === "circled" ? circled(i) : letters(i);
}

export function parseAnswerSet(ans: string) {
  return ans.split("").filter(Boolean);
}

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
