import { NextResponse } from "next/server"
import { jsonOk } from "@/app/api/_lib/response"
import { requireUser } from "@/app/api/_lib/supabase"

export async function GET() {
  const { user, res } = await requireUser()
  const out = NextResponse.json({ ok: true, data: { user } })
  if (res) {
    // Copy any refreshed cookies onto this response
    for (const c of res.cookies.getAll()) out.cookies.set(c)
  }
  return out
}

