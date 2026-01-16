export type Attachment = {
  id: string
  name: string
  type: string
  size: number
  bucket: string
  path: string
  kind:
    | "image"
    | "audio"
    | "video"
    | "pdf"
    | "spreadsheet"
    | "document"
    | "text"
    | "file"
}

export type Task = {
  id: string
  title: string
  description?: string
  completed: boolean
  dueAt: string
  attachments: Attachment[]
}

export type DbTaskRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  due_at: string
  completed: boolean
  in_progress: boolean
  attachments: unknown
}

export function coerceAttachments(raw: unknown): Attachment[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(Boolean) as Attachment[]
}

export function fromDbTask(row: DbTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed: row.completed,
    dueAt: row.due_at,
    attachments: coerceAttachments(row.attachments),
  }
}

