import { jsonError, jsonOk } from "@/app/api/_lib/response"
import { requireUser } from "@/app/api/_lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST() {
  const { user, accessToken } = await requireUser()
  if (!user) return jsonError("Unauthorized", "UNAUTHORIZED", 401)

  const supabase = createServerSupabaseClient(accessToken ?? undefined)

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("user_id", user.id)
    .eq("completed", true)

  if (error) return jsonError(error.message, "DB", 500)
  return jsonOk({ ok: true })
}

