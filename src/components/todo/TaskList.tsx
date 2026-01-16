"use client"

import * as React from "react"
import {
  CirclePlay,
  CircleStop,
  Download,
  Trash2,
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Info,
  Music,
  Video,
} from "lucide-react"

import type { AttachmentKind, Todo } from "./types"
import { cn } from "@/lib/utils"
import { formatLocalDateTime, parseLocalDateOnly, parseLocalDateTime } from "./utils"
import { getTaskFlags } from "./utils"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

function AttachmentIcon({ kind }: { kind: AttachmentKind }) {
  const className = "h-4 w-4 text-muted-foreground"
  switch (kind) {
    case "image":
      return <ImageIcon className={className} />
    case "audio":
      return <Music className={className} />
    case "video":
      return <Video className={className} />
    case "spreadsheet":
      return <FileSpreadsheet className={className} />
    case "pdf":
    case "document":
    case "text":
      return <FileText className={className} />
    default:
      return <File className={className} />
  }
}

function TaskBadges({
  completed,
  overdue,
  inProgress,
  planned,
}: {
  completed: boolean
  overdue: boolean
  inProgress: boolean
  planned: boolean
}) {
  if (completed) {
    return (
      <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">Completed</Badge>
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      {inProgress && <Badge className="bg-sky-600 text-white hover:bg-sky-600">In progress</Badge>}
      {overdue && <Badge variant="destructive">Overdue</Badge>}
      {planned && <Badge variant="outline">Planned</Badge>}
    </span>
  )
}

export function TaskList({
  groups,
  nowMs,
  inProgressTaskId,
  conflictDueAt,
  onToggleCompleted,
  onToggleInProgress,
  onDelete,
  onAddFiles,
  onDownloadAttachment,
  onDeleteAttachment,
}: {
  groups: Array<{ date: string; items: Todo[] }>
  nowMs: number
  inProgressTaskId: string | null
  conflictDueAt: string | null
  onToggleCompleted: (id: string, completed: boolean) => void
  onToggleInProgress: (todoId: string, isInProgress: boolean) => void
  onDelete: (id: string) => void
  onAddFiles: (todoId: string) => void
  onDownloadAttachment: (a: Todo["attachments"][number]) => void
  onDeleteAttachment: (todoId: string, a: Todo["attachments"][number]) => void
}) {
  if (groups.length === 0) {
    return <p className="text-muted-foreground text-sm">No tasks yet.</p>
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.date} className="space-y-2">
          <div className="flex items-center gap-3 pt-2">
            <Separator className="flex-1" />
            <span className="text-muted-foreground whitespace-nowrap text-xs font-medium">
              {new Intl.DateTimeFormat(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "2-digit",
              }).format(parseLocalDateOnly(group.date))}
            </span>
            <Separator className="flex-1" />
          </div>

          {group.items.map((todo) => {
            const flags = getTaskFlags(todo, nowMs, inProgressTaskId)

            return (
              <div
                key={todo.id}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  flags.completed && "opacity-75",
                  flags.overdue && "border-destructive/40 bg-destructive/5 text-muted-foreground",
                  flags.inProgress && "border-sky-500/40 bg-sky-500/10",
                  conflictDueAt &&
                    todo.dueAt === conflictDueAt &&
                    "border-destructive/60 bg-destructive/5 ring-1 ring-destructive/30"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <label className="flex min-w-0 cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={(v) => onToggleCompleted(todo.id, Boolean(v))}
                      aria-label={`Mark "${todo.title}" as ${
                        todo.completed ? "not completed" : "completed"
                      }`}
                      className="mt-0.5"
                    />
                    <span
                      className={cn(
                        "leading-6",
                        todo.completed && "text-muted-foreground line-through"
                      )}
                    >
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="block min-w-0 truncate">{todo.title}</span>
                        <TaskBadges {...flags} />
                        {todo.description && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background"
                                  aria-label="View description"
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="whitespace-pre-wrap text-sm">{todo.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        Due: {formatLocalDateTime(todo.dueAt)}
                      </span>
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {!todo.completed && (
                      <Button
                        type="button"
                        variant={flags.inProgress ? "default" : "outline"}
                        size="sm"
                        onClick={() => onToggleInProgress(todo.id, flags.inProgress)}
                        className={cn(flags.inProgress && "bg-sky-600 hover:bg-sky-600")}
                      >
                        {flags.inProgress ? (
                          <>
                            <CircleStop className="mr-1 h-4 w-4" />
                            Stop
                          </>
                        ) : (
                          <>
                            <CirclePlay className="mr-1 h-4 w-4" />
                            Start
                          </>
                        )}
                      </Button>
                    )}

                    {todo.completed && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAddFiles(todo.id)}
                      >
                        Add files
                      </Button>
                    )}

                    {!todo.completed && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete "${todo.title}"`}
                        onClick={() => onDelete(todo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {todo.completed && todo.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-muted-foreground text-xs">Attachments</p>
                    <ul className="space-y-1">
                      {todo.attachments.map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-col gap-2 rounded-md bg-muted/30 px-2 py-1 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <AttachmentIcon kind={a.kind} />
                            <span className="truncate text-sm">{a.name}</span>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onDownloadAttachment(a)}
                              className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label={`Remove attachment "${a.name}"`}
                              onClick={() => onDeleteAttachment(todo.id, a)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

