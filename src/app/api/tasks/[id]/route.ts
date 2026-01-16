import { z } from "zod"
import { jsonError, jsonOk } from "@/app/api/_lib/response"
import { requireUser } from "@/app/api/_lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const patchSchema = z
  .object({
    completed: z.boolean().optional(),
    description: z.string().max(500).nullable().optional(),
    title: z.string().min(1).max(80).optional(),
    dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional(),
    attachments: z.any().optional(),
  })
  .strict()

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, accessToken } = await requireUser()
  if (!user) return jsonError("Unauthorized", "UNAUTHORIZED", 401)

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return jsonError("Invalid request body.", "BAD_REQUEST", 400)

  const supabase = createServerSupabaseClient(accessToken ?? undefined)

  const update: Record<string, unknown> = {}
  if (typeof parsed.data.completed === "boolean") {
    update.completed = parsed.data.completed
    if (parsed.data.completed) update.in_progress = false
  }
  if (typeof parsed.data.title === "string") update.title = parsed.data.title.trim()
  if (typeof parsed.data.dueAt === "string") update.due_at = parsed.data.dueAt
  if (parsed.data.description !== undefined)
    update.description = parsed.data.description ? parsed.data.description.trim() : null
  if (parsed.data.attachments !== undefined) update.attachments = parsed.data.attachments

  const { error } = await supabase.from("tasks").update(update).eq("id", id).eq("user_id", user.id)
  if (error) return jsonError(error.message, "DB", 500)

  return jsonOk({ ok: true })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, accessToken } = await requireUser()
  if (!user) return jsonError("Unauthorized", "UNAUTHORIZED", 401)
  const { id } = await ctx.params

  const supabase = createServerSupabaseClient(accessToken ?? undefined)

  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id)
  if (error) return jsonError(error.message, "DB", 500)
  return jsonOk({ ok: true })
}

