"use client"

import type { DailyLoad, Todo } from "./types"

export function pad2(n: number) {
  return String(n).padStart(2, "0")
}

export function localDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function getDatePart(dueAt: string) {
  return dueAt.split("T")[0] ?? ""
}

export function getTimePart(dueAt: string) {
  return dueAt.split("T")[1] ?? ""
}

export function parseLocalDateTime(value: string): number {
  const [datePart, timePart] = value.split("T")
  const [y, m, d] = datePart.split("-").map(Number)
  const [hh, mm] = timePart.split(":").map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime()
}

export function parseLocalDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function parseLocalTimeToMinutes(value: string): number {
  const [hh, mm] = value.split(":").map(Number)
  return hh * 60 + mm
}

export function formatLocalDateTime(value: string): string {
  const ms = parseLocalDateTime(value)
  if (!Number.isFinite(ms)) return value
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms))
}

export function formatDateTimeFromMs(ms: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms))
}

export function minutesUntil(targetMs: number, nowMs: number) {
  return Math.ceil((targetMs - nowMs) / 60_000)
}

export function getDailyLoad(todosForDay: Todo[]) {
  const labels = [
    "00:00–04:00",
    "04:00–08:00",
    "08:00–12:00",
    "12:00–16:00",
    "16:00–20:00",
    "20:00–24:00",
  ]
  const buckets = Array.from({ length: 6 }, () => 0) as number[]
  for (const t of todosForDay) {
    const ms = parseLocalDateTime(t.dueAt)
    const hour = new Date(ms).getHours()
    const idx = Math.floor(hour / 4)
    buckets[idx] = (buckets[idx] ?? 0) + 1
  }

  const total = todosForDay.length
  const peak = Math.max(0, ...buckets)
  const spread = buckets.filter((c) => c > 0).length
  const busiestIdx = buckets.findIndex((c) => c === peak)
  const busiestWindow = busiestIdx >= 0 ? labels[busiestIdx] : labels[0]

  const score = total + peak * 1.5 + Math.max(0, spread - 1) * 0.5
  const load: DailyLoad = score <= 5 ? "light" : score <= 10 ? "balanced" : "heavy"

  return { load, total, peak, spread, busiestWindow, labels, buckets }
}

export function getTaskFlags(todo: Todo, nowMs: number, inProgressTaskId: string | null) {
  const completed = todo.completed
  const dueMs = parseLocalDateTime(todo.dueAt)
  const overdue = !completed && dueMs < nowMs
  const inProgress = !completed && inProgressTaskId === todo.id
  const planned = !completed && !overdue && !inProgress
  return { completed, overdue, inProgress, planned }
}

