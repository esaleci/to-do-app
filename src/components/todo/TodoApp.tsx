"use client"

import * as React from "react"
import { Bell } from "lucide-react"
import { toast } from "sonner"

import type { DailyLoad, Todo } from "./types"
import { initialTodos } from "./mock-data"
import { TaskForm } from "./TaskForm"
import { TaskList } from "./TaskList"
import { UserMenu } from "./UserMenu"

import { apiFetch, ApiError } from "@/lib/api-client"
import { ModeToggle } from "@/components/mode-toggle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import type { TodoFormValues } from "./schemas"
import {
  addDays,
  endOfDay,
  formatDateTimeFromMs,
  formatLocalDateTime,
  getDailyLoad,
  getDatePart,
  getTimePart,
  localDateKey,
  minutesUntil,
  parseLocalDateOnly,
  parseLocalDateTime,
  parseLocalTimeToMinutes,
  startOfDay,
} from "./utils"

function DailyLoadBadge({ load }: { load: DailyLoad }) {
  if (load === "heavy") return <Badge variant="destructive">Heavy</Badge>
  if (load === "balanced") return <Badge variant="secondary">Balanced</Badge>
  return <Badge variant="outline">Light</Badge>
}

export function TodoApp({ userId, onSignedOut }: { userId: string; onSignedOut: () => void }) {
  const [todos, setTodos] = React.useState<Todo[]>([])
  const [tasksLoading, setTasksLoading] = React.useState(true)
  const [tasksError, setTasksError] = React.useState<{ code?: string; message: string } | null>(
    null
  )

  const [attachTargetTodoId, setAttachTargetTodoId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [conflictDueAt, setConflictDueAt] = React.useState<string | null>(null)
  const clearConflictTimerRef = React.useRef<number | null>(null)

  const [focusMode, setFocusMode] = React.useState(false)
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const [inProgressTaskId, setInProgressTaskId] = React.useState<string | null>(null)

  const [dismissedReminderTaskId, setDismissedReminderTaskId] = React.useState<string | null>(null)

  const [filterMode, setFilterMode] = React.useState<"between" | "exact">("between")
  const [filterFromDate, setFilterFromDate] = React.useState<string>("")
  const [filterFromTime, setFilterFromTime] = React.useState<string>("")
  const [filterToDate, setFilterToDate] = React.useState<string>("")
  const [filterToTime, setFilterToTime] = React.useState<string>("")
  const [filterExactDate, setFilterExactDate] = React.useState<string>("")
  const [filterExactTime, setFilterExactTime] = React.useState<string>("")

  const [pageSize, setPageSize] = React.useState<number>(5)
  const [page, setPage] = React.useState<number>(1)

  React.useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  React.useEffect(() => {
    if (!inProgressTaskId) return
    const t = todos.find((x) => x.id === inProgressTaskId)
    if (!t || t.completed) setInProgressTaskId(null)
  }, [inProgressTaskId, todos])

  React.useEffect(() => {
    let alive = true
    async function load() {
      setTasksLoading(true)
      try {
        const data = await apiFetch<{ tasks: Todo[]; inProgressTaskId: string | null }>("/api/tasks")
        if (!alive) return
        setTodos(data.tasks)
        setInProgressTaskId(data.inProgressTaskId)
        setTasksError(null)
      } catch (e) {
        if (!alive) return
        if (e instanceof ApiError) setTasksError({ code: e.code, message: e.message })
        else setTasksError({ message: e instanceof Error ? e.message : "Failed to load tasks." })
        setTodos([])
        setInProgressTaskId(null)
      } finally {
        if (!alive) return
        setTasksLoading(false)
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [])

  const nextUpcoming = React.useMemo(() => {
    const upcoming = todos
      .filter((t) => !t.completed)
      .map((t) => ({ todo: t, dueMs: parseLocalDateTime(t.dueAt) }))
      .filter((x) => x.dueMs >= nowMs)
      .sort((a, b) => a.dueMs - b.dueMs)[0]
    return upcoming ?? null
  }, [nowMs, todos])

  React.useEffect(() => {
    if (nextUpcoming && nextUpcoming.todo.id !== dismissedReminderTaskId) return
    if (!nextUpcoming) setDismissedReminderTaskId(null)
  }, [dismissedReminderTaskId, nextUpcoming])

  const reminder = React.useMemo(() => {
    const REMINDER_WINDOW_MIN = 15
    if (!nextUpcoming) return null
    if (dismissedReminderTaskId === nextUpcoming.todo.id) return null
    const mins = minutesUntil(nextUpcoming.dueMs, nowMs)
    if (mins < 0 || mins > REMINDER_WINDOW_MIN) return null
    return { ...nextUpcoming, mins }
  }, [dismissedReminderTaskId, nextUpcoming, nowMs])

  const filteredTodos = React.useMemo(() => {
    if (focusMode) {
      const endMs = nowMs + 4 * 60 * 60 * 1000
      return todos.filter((t) => {
        const ms = parseLocalDateTime(t.dueAt)
        return ms >= nowMs && ms <= endMs
      })
    }

    if (filterMode === "exact") {
      if (!filterExactDate && !filterExactTime) return todos
      if (filterExactDate && !filterExactTime) {
        return todos.filter((t) => getDatePart(t.dueAt) === filterExactDate)
      }
      if (filterExactDate && filterExactTime) {
        const exactMs = parseLocalDateTime(`${filterExactDate}T${filterExactTime}`)
        return todos.filter((t) => parseLocalDateTime(t.dueAt) === exactMs)
      }
      return todos.filter((t) => getTimePart(t.dueAt) === filterExactTime)
    }

    const hasAnyDate = Boolean(filterFromDate || filterToDate)
    const hasAnyTime = Boolean(filterFromTime || filterToTime)

    const fromDateMs = filterFromDate
      ? startOfDay(parseLocalDateOnly(filterFromDate)).getTime()
      : Number.NEGATIVE_INFINITY
    const toDateMs = filterToDate
      ? endOfDay(parseLocalDateOnly(filterToDate)).getTime()
      : Number.POSITIVE_INFINITY

    const fromTimeMin = filterFromTime ? parseLocalTimeToMinutes(filterFromTime) : 0
    const toTimeMin = filterToTime ? parseLocalTimeToMinutes(filterToTime) : 24 * 60 - 1

    return todos.filter((t) => {
      const ms = parseLocalDateTime(t.dueAt)
      if (hasAnyDate && (ms < fromDateMs || ms > toDateMs)) return false
      if (hasAnyTime) {
        const time = getTimePart(t.dueAt)
        if (!time) return false
        const mins = parseLocalTimeToMinutes(time)
        if (mins < fromTimeMin || mins > toTimeMin) return false
      }
      return true
    })
  }, [
    todos,
    focusMode,
    nowMs,
    filterMode,
    filterExactDate,
    filterExactTime,
    filterFromDate,
    filterFromTime,
    filterToDate,
    filterToTime,
  ])

  const sortedFilteredTodos = React.useMemo(
    () =>
      filteredTodos
        .slice()
        .sort((a, b) => parseLocalDateTime(a.dueAt) - parseLocalDateTime(b.dueAt)),
    [filteredTodos]
  )

  React.useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(sortedFilteredTodos.length / pageSize))
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [pageSize, sortedFilteredTodos.length])

  const totalItems = sortedFilteredTodos.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const showPagination = totalPages > 1

  const pageItems = React.useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedFilteredTodos.slice(start, start + pageSize)
  }, [page, pageSize, sortedFilteredTodos])

  const groupedTodos = React.useMemo(() => {
    const groups: Array<{ date: string; items: Todo[] }> = []
    for (const t of pageItems) {
      const date = getDatePart(t.dueAt)
      const last = groups[groups.length - 1]
      if (!last || last.date !== date) groups.push({ date, items: [t] })
      else last.items.push(t)
    }
    return groups
  }, [pageItems])

  const completedCount = filteredTodos.filter((t) => t.completed).length

  async function requestAttachmentsForTodo(todoId: string) {
    setAttachTargetTodoId(todoId)
    queueMicrotask(() => fileInputRef.current?.click())
  }

  async function handleFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const targetId = attachTargetTodoId
    e.target.value = ""
    setAttachTargetTodoId(null)
    if (!targetId || files.length === 0) return

    const form = new FormData()
    for (const f of files) form.append("files", f)

    try {
      const res = await fetch(`/api/tasks/${targetId}/attachments`, {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const json = (await res.json().catch(() => null)) as
        | { ok: true; data: { task: Todo } }
        | { ok: false; error: { message: string } }
        | null
      if (!json || !json.ok) throw new Error(json?.error.message ?? "Upload failed.")
      setTodos((prev) => prev.map((t) => (t.id === targetId ? json.data.task : t)))
    } catch (err) {
      toast.error("Upload failed", { description: err instanceof Error ? err.message : "Failed." })
    }
  }

  async function addTodo(values: TodoFormValues) {
    const conflicts = todos.filter((t) => t.dueAt === values.dueAt)
    if (conflicts.length > 0) {
      setConflictDueAt(values.dueAt)
      if (clearConflictTimerRef.current) window.clearTimeout(clearConflictTimerRef.current)
      clearConflictTimerRef.current = window.setTimeout(() => setConflictDueAt(null), 8000)

      const [d, time] = values.dueAt.split("T")
      setFilterMode("exact")
      setFilterExactDate(d ?? "")
      setFilterExactTime(time ?? "")
      setPage(1)

      toast.error("Time conflict", {
        description: `You already have ${conflicts.length} task(s) scheduled at ${formatLocalDateTime(
          values.dueAt
        )}.`,
      })
    }

    const data = await apiFetch<{ task: Todo }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(values),
    })
    setTodos((prev) => [data.task, ...prev])
  }

  async function toggleTodo(id: string, completed: boolean) {
    const before = todos.find((t) => t.id === id)
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)))
    if (completed) setInProgressTaskId((cur) => (cur === id ? null : cur))

    try {
      await apiFetch("/api/tasks/" + id, { method: "PATCH", body: JSON.stringify({ completed }) })
    } catch (e) {
      toast.error("Failed to update task", { description: e instanceof Error ? e.message : "Failed." })
    }

    if (completed && before && !before.completed) {
      await requestAttachmentsForTodo(id)
    }
  }

  async function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    setInProgressTaskId((cur) => (cur === id ? null : cur))
    try {
      await apiFetch("/api/tasks/" + id, { method: "DELETE" })
    } catch (e) {
      toast.error("Failed to delete task", { description: e instanceof Error ? e.message : "Failed." })
    }
  }

  async function clearCompleted() {
    const completedIds = new Set(todos.filter((t) => t.completed).map((t) => t.id))
    if (completedIds.size === 0) return
    setTodos((prev) => prev.filter((t) => !completedIds.has(t.id)))
    try {
      await apiFetch("/api/tasks/clear-completed", { method: "POST" })
    } catch (e) {
      toast.error("Failed to clear completed", { description: e instanceof Error ? e.message : "Failed." })
    }
  }

  async function setInProgress(taskId: string | null) {
    setInProgressTaskId(taskId)
    try {
      const data = await apiFetch<{ inProgressTaskId: string | null }>("/api/tasks/in-progress", {
        method: "POST",
        body: JSON.stringify({ id: taskId }),
      })
      setInProgressTaskId(data.inProgressTaskId)
    } catch (e) {
      toast.error("Failed to update in-progress", { description: e instanceof Error ? e.message : "Failed." })
    }
  }

  async function downloadAttachment(a: Todo["attachments"][number]) {
    const data = await apiFetch<{ signedUrl: string }>("/api/attachments/signed-url", {
      method: "POST",
      body: JSON.stringify({ bucket: a.bucket, path: a.path }),
    })
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  async function deleteAttachment(todoId: string, attachmentId: string) {
    try {
      const data = await apiFetch<{ task: Todo }>(`/api/tasks/${todoId}/attachments/delete`, {
        method: "POST",
        body: JSON.stringify({ attachmentId }),
      })
      setTodos((prev) => prev.map((t) => (t.id === todoId ? data.task : t)))
    } catch (e) {
      toast.error("Failed to remove attachment", {
        description: e instanceof Error ? e.message : "Failed.",
      })
    }
  }

  async function seedDemoTasks() {
    if (todos.length > 0) return
    const data = await apiFetch<{ tasks: Todo[] }>("/api/tasks/seed", {
      method: "POST",
      body: JSON.stringify({ tasks: initialTodos }),
    })
    setTodos(data.tasks)
  }

  const loadDayKey = React.useMemo(() => {
    if (filterMode === "exact" && filterExactDate) return filterExactDate
    if (filterFromDate && !filterToDate) return filterFromDate
    if (filterFromDate && filterToDate && filterFromDate === filterToDate) return filterFromDate
    if (!filterFromDate && filterToDate) return filterToDate
    return localDateKey(new Date(nowMs))
  }, [filterExactDate, filterFromDate, filterMode, filterToDate, nowMs])

  const dailyLoad = React.useMemo(() => {
    const dayTodos = todos.filter((t) => getDatePart(t.dueAt) === loadDayKey)
    return getDailyLoad(dayTodos)
  }, [loadDayKey, todos])

  const summary = React.useMemo(() => {
    const now = new Date(nowMs)
    const todayKey = localDateKey(now)
    const tomorrow = addDays(now, 1)
    const tomorrowKey = localDateKey(tomorrow)
    const labels = dailyLoad.labels

    const todays = todos.filter((t) => t.dueAt.startsWith(todayKey))
    const todayCompleted = todays.filter((t) => t.completed).length
    const todayPending = todays.length - todayCompleted

    const tomorrowTasks = todos.filter((t) => t.dueAt.startsWith(tomorrowKey))
    const tomorrowBuckets = Array.from({ length: 6 }, () => 0) as number[]
    for (const t of tomorrowTasks) {
      const hour = new Date(parseLocalDateTime(t.dueAt)).getHours()
      tomorrowBuckets[Math.floor(hour / 4)]++
    }

    const rangeStart = startOfDay(tomorrow).getTime()
    const rangeEnd = addDays(startOfDay(tomorrow), 7).getTime()
    const buckets = Array.from({ length: 6 }, () => 0) as number[]
    const upcoming = todos.filter((t) => {
      const ms = parseLocalDateTime(t.dueAt)
      return ms >= rangeStart && ms < rangeEnd
    })
    for (const t of upcoming) {
      const hour = new Date(parseLocalDateTime(t.dueAt)).getHours()
      buckets[Math.floor(hour / 4)]++
    }

    return {
      todayCompleted,
      todayPending,
      tomorrowTotal: tomorrowTasks.length,
      tomorrowBuckets: labels.map((label, i) => ({ label, count: tomorrowBuckets[i] ?? 0 })),
      upcomingTotal: upcoming.length,
      upcomingBuckets: labels.map((label, i) => ({ label, count: buckets[i] ?? 0 })),
    }
  }, [dailyLoad.labels, nowMs, todos])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-row items-center gap-2">
        <UserMenu userId={userId} onSignedOut={onSignedOut} />
          <CardTitle className="text-2xl">To‑Do</CardTitle>
          </div>
          <p className="text-muted-foreground text-sm">
            {completedCount}/{filteredTodos.length} completed
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={focusMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFocusMode((v) => !v)
                    setPage(1)
                  }}
                >
                  Focus Mode
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show tasks for the next 4 hours.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        
          <ModeToggle />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {tasksLoading && <p className="text-muted-foreground text-sm">Loading tasks…</p>}

        {!tasksLoading && tasksError?.code === "MISSING_TABLE" && (
          <Alert variant="destructive">
            <AlertTitle>Database not initialized</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  The Supabase table <code>public.tasks</code> was not found. Run the SQL in{" "}
                  <code>supabase/schema.sql</code> (Supabase Dashboard → SQL Editor), then refresh.
                </p>
                <p className="text-xs opacity-90">{tasksError.message}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!tasksLoading && tasksError && tasksError.code !== "MISSING_TABLE" && (
          <Alert variant="destructive">
            <AlertTitle>Failed to load tasks</AlertTitle>
            <AlertDescription>{tasksError.message}</AlertDescription>
          </Alert>
        )}

        {!tasksLoading && todos.length === 0 && (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">No tasks yet.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => void seedDemoTasks()}
            >
              Seed demo tasks
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={[
            "image/*",
            "audio/*",
            "video/*",
            ".pdf",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".csv",
            ".txt",
            ".md",
            ".rtf",
          ].join(",")}
          onChange={handleFilesPicked}
        />

        {reminder && (
          <Alert className="border-primary/30 bg-primary/5">
            <Bell className="h-4 w-4" />
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AlertTitle className="text-sm">
                  Next task starts in {reminder.mins} minute{reminder.mins === 1 ? "" : "s"}
                </AlertTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDismissedReminderTaskId(reminder.todo.id)}
                >
                  Dismiss
                </Button>
              </div>
              <AlertDescription className="text-sm">
                <span className="font-medium">{reminder.todo.title}</span> ·{" "}
                {formatDateTimeFromMs(reminder.dueMs)}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              Daily load{" "}
              <span className="text-muted-foreground font-normal">
                ({new Intl.DateTimeFormat(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                }).format(parseLocalDateOnly(loadDayKey))})
              </span>
            </p>
            <DailyLoadBadge load={dailyLoad.load} />
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {dailyLoad.total} task(s) · busiest window {dailyLoad.busiestWindow} ({dailyLoad.peak})
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">Today’s Tasks</p>
            <p className="mt-2 text-2xl font-semibold">{summary.todayCompleted} completed</p>
            <p className="text-muted-foreground text-sm">{summary.todayPending} pending</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">Tomorrow’s Tasks</p>
            <p className="mt-2 text-2xl font-semibold">{summary.tomorrowTotal}</p>
            <div className="mt-2 space-y-1">
              {summary.tomorrowBuckets.map((b) => (
                <div key={b.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-medium">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">Tasks Until Next Week</p>
            <p className="mt-2 text-2xl font-semibold">{summary.upcomingTotal}</p>
            <div className="mt-2 space-y-1">
              {summary.upcomingBuckets.map((b) => (
                <div key={b.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-medium">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {focusMode && (
          <div className="flex flex-col gap-1 rounded-lg border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-medium">Focus Mode:</span> showing tasks due in the next 4 hours
              (until <span className="font-medium">{formatDateTimeFromMs(nowMs + 4 * 60 * 60 * 1000)}</span>)
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFocusMode(false)}>
              Exit
            </Button>
          </div>
        )}

        <TaskForm onAdd={addTodo} />

        <Separator />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Filter by date & time</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={filterMode === "between" ? "default" : "outline"}
                onClick={() => setFilterMode("between")}
              >
                Between
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filterMode === "exact" ? "default" : "outline"}
                onClick={() => setFilterMode("exact")}
              >
                Exact
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFilterFromDate("")
                  setFilterFromTime("")
                  setFilterToDate("")
                  setFilterToTime("")
                  setFilterExactDate("")
                  setFilterExactTime("")
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {filterMode === "between" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} />
                <Input type="time" value={filterFromTime} onChange={(e) => setFilterFromTime(e.target.value)} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} />
                <Input type="time" value={filterToTime} onChange={(e) => setFilterToTime(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input type="date" value={filterExactDate} onChange={(e) => setFilterExactDate(e.target.value)} />
              <Input type="time" value={filterExactTime} onChange={(e) => setFilterExactTime(e.target.value)} />
            </div>
          )}
        </div>

        <Separator />

        <TaskList
          groups={groupedTodos}
          nowMs={nowMs}
          inProgressTaskId={inProgressTaskId}
          conflictDueAt={conflictDueAt}
          onToggleCompleted={(id, completed) => void toggleTodo(id, completed)}
          onToggleInProgress={(id, isInProgress) => void setInProgress(isInProgress ? null : id)}
          onDelete={(id) => void deleteTodo(id)}
          onAddFiles={(id) => void requestAttachmentsForTodo(id)}
          onDownloadAttachment={(a) => void downloadAttachment(a)}
          onDeleteAttachment={(todoId, a) => void deleteAttachment(todoId, a.id)}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Items per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                const next = Number(v)
                setPageSize(next)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showPagination && (
            <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>
              <span className="text-muted-foreground text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void clearCompleted()}
            disabled={completedCount === 0}
          >
            Clear completed
          </Button>
          <span className="text-muted-foreground text-sm">Supabase-backed</span>
        </div>
      </CardContent>
    </Card>
  )
}

