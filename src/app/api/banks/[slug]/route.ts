import { NextResponse } from "next/server";
import { loadBank } from "@/lib/bank";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bank = loadBank(slug);
  if (!bank) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ bank }, { headers: { "Cache-Control": "public, max-age=60" } });
}
