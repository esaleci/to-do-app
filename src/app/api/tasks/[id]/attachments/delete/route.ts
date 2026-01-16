import { jsonError, jsonOk } from "@/app/api/_lib/response"
import { requireUser } from "@/app/api/_lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { DbTaskRow } from "@/app/api/tasks/types"
import { coerceAttachments, fromDbTask } from "@/app/api/tasks/types"
import { z } from "zod"

const schema = z.object({
  attachmentId: z.string().min(1),
})

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, accessToken } = await requireUser()
  if (!user) return jsonError("Unauthorized", "UNAUTHORIZED", 401)

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError("Invalid request body.", "BAD_REQUEST", 400)

  const supabase = createServerSupabaseClient(accessToken ?? undefined)

  const { data: taskRow, error: taskErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (taskErr || !taskRow) return jsonError(taskErr?.message ?? "Task not found.", "DB", 404)

  const task = taskRow as DbTaskRow
  const current = coerceAttachments(task.attachments)
  const target = current.find((a) => a.id === parsed.data.attachmentId)
  if (!target) return jsonError("Attachment not found.", "NOT_FOUND", 404)

  // Best-effort delete from Storage first.
  const storageRes = await supabase.storage.from(target.bucket).remove([target.path])
  if (storageRes.error) return jsonError(storageRes.error.message, "STORAGE", 500)

  const nextAttachments = current.filter((a) => a.id !== parsed.data.attachmentId)

  const { data: updated, error: updErr } = await supabase
    .from("tasks")
    .update({ attachments: nextAttachments })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single()

  if (updErr || !updated) return jsonError(updErr?.message ?? "Failed to update task.", "DB", 500)

  return jsonOk({ task: fromDbTask(updated as DbTaskRow) })
}

