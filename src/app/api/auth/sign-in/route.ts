import { NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { jsonError, jsonOk } from "@/app/api/_lib/response"
import { setAuthCookies } from "@/app/api/_lib/auth"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError("Invalid request body.", "BAD_REQUEST", 400)

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || !data.session) return jsonError(error?.message ?? "Sign-in failed.", "AUTH", 401)

  const res = jsonOk({ user: data.user })
  setAuthCookies(res, data.session.access_token, data.session.refresh_token)
  return res
}

