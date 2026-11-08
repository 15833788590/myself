import fs from "fs";
import path from "path";
import type { Bank, BankMeta, Question, Term } from "./types";

const DIR = path.join(process.cwd(), "data", "banks");

function ensureDir() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
}

export function bankFile(slug: string) {
  return path.join(DIR, slug + ".json");
}

export function transform(slug: string, raw: any): Bank {
  const questions: Question[] = [];
  const terms: Term[] = [];
  raw.units.forEach((u: any, ui: number) => {
    (u.questions || []).forEach((q: any, qi: number) => {
      questions.push({
        id: `${slug}:${ui}:${q.type}:${q.no}`,
        bank: slug, unit: ui, kind: q.type, no: q.no,
        stem: q.stem, options: q.options || [], answer: q.answer,
      });
    });
    (u.texts || []).forEach((t: any) => {
      questions.push({
        id: `${slug}:${ui}:${t.type}:${t.no}`,
        bank: slug, unit: ui, kind: t.type, no: t.no,
        stem: t.stem, options: [], answer: t.answer,
      });
    });
    (u.terms || []).forEach((t: any, ti: number) => {
      terms.push({
        id: `${slug}:${ui}:term:${ti + 1}`,
        bank: slug, unit: ui, no: ti + 1, term: t.term, definition: t.definition,
      });
    });
  });
  const counts = {
    single: questions.filter(q => q.kind === "single").length,
    multi: questions.filter(q => q.kind === "multi").length,
    short: questions.filter(q => q.kind === "short").length,
    essay: questions.filter(q => q.kind === "essay").length,
    terms: terms.length,
  };
  return {
    slug, title: raw.title,
    unitTitles: raw.units.map((u: any) => u.title),
    counts, questions, terms,
    recital: raw.recital || [],
  };
}

export function listSlugs(): string[] {
  ensureDir();
  return fs.readdirSync(DIR).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)).sort();
}

export function loadBank(slug: string): Bank | null {
  const file = bankFile(slug);
  if (!fs.existsSync(file)) return null;
  return transform(slug, JSON.parse(fs.readFileSync(file, "utf8")));
}

export function listBanks(): BankMeta[] {
  return listSlugs().map(s => {
    const b = loadBank(s)!;
    return { slug: b.slug, title: b.title, unitTitles: b.unitTitles, counts: b.counts };
  });
}

export function importRawFile(srcPath: string, slug: string) {
  ensureDir();
  fs.copyFileSync(srcPath, bankFile(slug));
}
