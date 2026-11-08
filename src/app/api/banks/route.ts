import { NextResponse } from "next/server";
import { listBanks } from "@/lib/bank";

export async function GET() {
  return NextResponse.json({ banks: listBanks() });
}
