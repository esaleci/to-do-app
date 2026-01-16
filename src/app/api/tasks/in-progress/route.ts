import { z } from "zod"
import { jsonError, jsonOk } from "@/app/api/_lib/response"
import { requireUser } from "@/app/api/_lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const schema = z.object({ id: z.string().uuid().nullable() })

export async function POST(req: Request) {
  const { user, accessToken } = await requireUser()
  if (!user) return jsonError("Unauthorized", "UNAUTHORIZED", 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError("Invalid request body.", "BAD_REQUEST", 400)

  const supabase = createServerSupabaseClient(accessToken ?? undefined)

  // Clear current in-progress
  const clearRes = await supabase
    .from("tasks")
    .update({ in_progress: false })
    .eq("user_id", user.id)
    .eq("in_progress", true)
  if (clearRes.error) return jsonError(clearRes.error.message, "DB", 500)

  if (!parsed.data.id) return jsonOk({ inProgressTaskId: null })

  const setRes = await supabase
    .from("tasks")
    .update({ in_progress: true })
    .eq("user_id", user.id)
    .eq("id", parsed.data.id)
  if (setRes.error) return jsonError(setRes.error.message, "DB", 500)

  return jsonOk({ inProgressTaskId: parsed.data.id })
}

