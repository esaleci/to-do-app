import { z } from "zod"
import { jsonError, jsonOk } from "@/app/api/_lib/response"
import { requireUser } from "@/app/api/_lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { DbTaskRow } from "./types"
import { fromDbTask } from "./types"

const createSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).optional().or(z.literal("")),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
})

export async function GET() {
  const { user, accessToken } = await requireUser()
  if (!user) return jsonError("Unauthorized", "UNAUTHORIZED", 401)

  const supabase = createServerSupabaseClient(accessToken ?? undefined)

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("due_at", { ascending: true })

  if (error) {
    const msg = error.message ?? "Failed to load tasks."
    const code =
      msg.includes("Could not find the table") || msg.includes("schema cache")
        ? "MISSING_TABLE"
        : "DB"
    return jsonError(msg, code, 500)
  }

  const rows = (data ?? []) as DbTaskRow[]
  return jsonOk({
    tasks: rows.map(fromDbTask),
    inProgressTaskId: rows.find((r) => r.in_progress)?.id ?? null,
  })
}

export async function POST(req: Request) {
  const { user, accessToken } = await requireUser()
  if (!user) return jsonError("Unauthorized", "UNAUTHORIZED", 401)

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return jsonError("Invalid request body.", "BAD_REQUEST", 400)

  const supabase = createServerSupabaseClient(accessToken ?? undefined)

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: parsed.data.title.trim(),
      description: (parsed.data.description ?? "").trim() || null,
      due_at: parsed.data.dueAt,
      completed: false,
      in_progress: false,
      attachments: [],
    })
    .select("*")
    .single()

  if (error) return jsonError(error.message, "DB", 500)

  return jsonOk({ task: fromDbTask(data as DbTaskRow) })
}

