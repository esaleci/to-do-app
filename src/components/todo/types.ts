export type AttachmentKind =
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "spreadsheet"
  | "document"
  | "text"
  | "file"

export type Attachment = {
  id: string
  name: string
  type: string
  size: number
  bucket: string
  path: string
  kind: AttachmentKind
}

export type Todo = {
  id: string
  title: string
  description?: string
  completed: boolean
  // Stored as `datetime-local` string (YYYY-MM-DDTHH:mm) in local time.
  dueAt: string
  attachments: Attachment[]
}

export type DailyLoad = "light" | "balanced" | "heavy"

