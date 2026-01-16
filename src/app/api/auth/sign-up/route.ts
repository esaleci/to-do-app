import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { jsonError, jsonOk } from "@/app/api/_lib/response"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError("Invalid request body.", "BAD_REQUEST", 400)

  const supabase = createServerSupabaseClient()
  const { error } = await supabase.auth.signUp(parsed.data)
  if (error) return jsonError(error.message, "AUTH", 400)

  // Note: if email confirmations are enabled, user must confirm before signing in.
  return jsonOk({ ok: true })
}

