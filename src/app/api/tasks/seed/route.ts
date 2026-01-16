import { z } from "zod"
import { jsonError, jsonOk } from "@/app/api/_lib/response"
import { requireUser } from "@/app/api/_lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { DbTaskRow } from "../types"
import { fromDbTask } from "../types"

const taskSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  completed: z.boolean().optional(),
})

const schema = z.object({ tasks: z.array(taskSchema).min(1) })

export async function POST(req: Request) {
  const { user, accessToken } = await requireUser()
  if (!user) return jsonError("Unauthorized", "UNAUTHORIZED", 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError("Invalid request body.", "BAD_REQUEST", 400)

  const supabase = createServerSupabaseClient(accessToken ?? undefined)

  const payload = parsed.data.tasks.map((t) => ({
    user_id: user.id,
    title: t.title.trim(),
    description: (t.description ?? "").trim() || null,
    due_at: t.dueAt,
    completed: t.completed ?? false,
    in_progress: false,
    attachments: [],
  }))

  const { data, error } = await supabase.from("tasks").insert(payload).select("*")
  if (error) return jsonError(error.message, "DB", 500)

  const rows = (data ?? []) as DbTaskRow[]
  return jsonOk({ tasks: rows.map(fromDbTask) })
}

