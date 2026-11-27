import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";

export async function GET() {
  const user = await getServerSession();
  return NextResponse.json(
    { user: user ?? null },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
