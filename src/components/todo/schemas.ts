"use client"

import { z } from "zod"

export const todoSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(80, "Keep it under 80 characters."),
  description: z
    .string()
    .trim()
    .max(500, "Keep it under 500 characters.")
    .optional()
    .or(z.literal("")),
  dueAt: z
    .string()
    .min(1, "Due date & time is required.")
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Invalid date/time."),
})

export type TodoFormValues = z.infer<typeof todoSchema>

export const authSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
})

export type AuthValues = z.infer<typeof authSchema>

