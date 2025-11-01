import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

export async function GET() {
  const rows = await db.select().from(transactions).limit(100);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  await db.insert(transactions).values(body);
  return NextResponse.json({ ok: true });
}
