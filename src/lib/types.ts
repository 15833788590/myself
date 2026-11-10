export type QKind = "single" | "multi" | "short" | "essay";

export interface Question {
  id: string;
  bank: string;
  unit: number;
  kind: QKind;
  labelStyle?: "letters" | "circled";
  no: number;
  stem: string;
  options: string[];
  answer: string;
}

export interface Term {
  id: string;
  bank: string;
  unit: number;
  no: number;
  term: string;
  definition: string;
}

export interface Recital {
  unit: string;
  passages: string[];
}

export interface BankMeta {
  slug: string;
  title: string;
  unitTitles: string[];
  counts: { single: number; multi: number; short: number; essay: number; terms: number };
}

export interface Bank extends BankMeta {
  questions: Question[];
  terms: Term[];
  recital: Recital[];
}
