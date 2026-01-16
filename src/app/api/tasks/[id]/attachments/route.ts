import { jsonError, jsonOk } from "@/app/api/_lib/response"
import { requireUser } from "@/app/api/_lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Attachment, DbTaskRow } from "../../types"
import { coerceAttachments, fromDbTask } from "../../types"

function sanitizePathSegment(s: string) {
  return s.replace(/[^\w.\-]+/g, "_")
}

function getAttachmentKind(file: File) {
  const type = (file.type || "").toLowerCase()
  const name = file.name.toLowerCase()
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : ""

  if (type.startsWith("image/")) return "image" as const
  if (type.startsWith("audio/")) return "audio" as const
  if (type.startsWith("video/")) return "video" as const

  if (ext === "pdf") return "pdf" as const
  if (["xls", "xlsx", "csv"].includes(ext)) return "spreadsheet" as const
  if (["doc", "docx"].includes(ext)) return "document" as const
  if (["txt", "md", "rtf"].includes(ext)) return "text" as const
  return "file" as const
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, accessToken } = await requireUser()
  if (!user) return jsonError("Unauthorized", "UNAUTHORIZED", 401)
  const { id } = await ctx.params

  const supabase = createServerSupabaseClient(accessToken ?? undefined)

  const form = await req.formData()
  const files = form.getAll("files").filter((x): x is File => x instanceof File)
  if (files.length === 0) return jsonError("No files provided.", "BAD_REQUEST", 400)

  const { data: taskRow, error: taskErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (taskErr || !taskRow) return jsonError(taskErr?.message ?? "Task not found.", "DB", 404)

  const bucket = "task-attachments"
  const current = coerceAttachments((taskRow as DbTaskRow).attachments)
  const uploaded: Attachment[] = []

  for (const file of files) {
    const safeName = sanitizePathSegment(file.name)
    const path = `${user.id}/${id}/${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    if (error) return jsonError(error.message, "STORAGE", 500)

    uploaded.push({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
      bucket,
      path,
      kind: getAttachmentKind(file),
    })
  }

  const nextAttachments = [...current, ...uploaded]
  const { error: updErr, data: updated } = await supabase
    .from("tasks")
    .update({ attachments: nextAttachments })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single()

  if (updErr || !updated) return jsonError(updErr?.message ?? "Failed to update.", "DB", 500)
  return jsonOk({ task: fromDbTask(updated as DbTaskRow) })
}

