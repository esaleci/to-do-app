# To‑Do App (Next.js + shadcn/ui + Supabase)

## Project overview & goals
This project is a **time-aware to‑do application** built with **Next.js (App Router)** and a **dark-first UI** using **shadcn/ui**.  
The primary goal is to provide a simple but professional task planner that supports:

- Scheduling tasks with **date + time**
- Fast views for “what’s next” (**Focus Mode**, reminders)
- Clear visual task states (**Planned / In Progress / Completed / Overdue**)
- Persistent storage and authentication via **Supabase** (database + storage)

## Key features

### Task management
- **Create tasks** with:
  - Title (required)
  - **Optional description** (textarea)
  - **Due date & time** (required)
- **Complete / uncomplete** tasks.
- **Delete** tasks (note: the **Delete button is hidden for completed tasks**).
- **Seed demo tasks** (useful on fresh accounts).

### Attachments (Supabase Storage)
- Attach multiple files to a task **when it is completed**.
- Supported examples: PDFs, spreadsheets, documents, text, images, audio, video.
- Attachment list includes:
  - Type icon
  - Download action (via signed URL)
  - **Remove attachment** (trash icon) which deletes from Storage and updates the task record.

### Time-based planning & filtering
- **Filter** tasks by:
  - Date only (show tasks for that date)
  - Time only (show tasks matching time-of-day)
  - Between ranges (date range and/or time-of-day range)
  - Exact matching (date, or date+time)
- Task list is **grouped by date** with a divider/label for clarity.
- **Pagination** when list is large, with user-selectable page size (dropdown).

### Focus Mode
- One-click **Focus Mode** to show tasks due in the **next 4 hours** from the current time.

### Visual task states
Tasks communicate state via badges + subtle styling (no disruptive notifications):
- **Planned**: scheduled in the future
- **In Progress**: user-selected “current focus” (only one at a time)
- **Overdue**: due date/time is in the past and task is not completed (**automatic**)
- **Completed**: finished

Note: **Overdue** and **In Progress** can be shown simultaneously (time-based + user focus).

### Daily load indicator
At the top of the page, a **Daily Load** panel classifies the day as:
- **Light / Balanced / Heavy**

This is computed from the number of tasks for the target day and how concentrated they are within **4-hour time windows**.

### Summary cards
- **Today’s Tasks**: completed vs pending
- **Tomorrow’s Tasks**: total + 4-hour window breakdown
- **Tasks Until Next Week**: upcoming count + 4-hour window breakdown

### Non-intrusive reminder
As the next task time approaches, the app shows an **in-app reminder banner** (no toast) when the next upcoming task is within a short window (currently 15 minutes).  
Users can dismiss the reminder per-task.

### Time conflict hint
When adding a task, the app detects **conflicts at the same date+time** and:
- highlights conflicting tasks
- shows a toast explaining the conflict

## UX decisions & product thinking
- **Dark-first**: the default theme is dark for comfort in long sessions; toggle is always accessible.
- **Time is a first-class field**: due date/time is required to support planning.
- **Non-disruptive feedback**: most guidance is inline (badges, banners, highlights). Toasts are used sparingly for actionable events (e.g., conflict).
- **Progress visibility**: counts (completed vs total) and summary cards make the current workload obvious.
- **Fast “next action”**: Focus Mode helps narrow attention to the next few hours.

## Backend: Supabase integration

### Authentication
- Email/password auth via **Supabase Auth**.
- Session tokens are stored in **httpOnly cookies** and managed by API routes.

### Database
- `public.tasks` stores tasks per user with **Row Level Security (RLS)**.
- Includes a single-task “in progress” guarantee via a **partial unique index**.

### Storage
- Bucket: **`task-attachments`** (private)
- Attachments are stored in Storage; task rows store attachment metadata in `tasks.attachments` (jsonb).
- Downloads use **signed URLs** (short-lived).

### RLS (simple policies)
The provided SQL configures:
- Tasks: users can only select/insert/update/delete their own tasks
- Storage: users can only read/write/delete their own objects in the bucket

## Architecture & code structure

### API-based logic (clean separation)
All Supabase operations are performed in **Next.js API routes** under:

- `src/app/api/auth/*` — sign-in / sign-up / sign-out / me
- `src/app/api/tasks/*` — list/create/update/delete/seed/in-progress/attachments
- `src/app/api/attachments/*` — signed download URLs

Shared server helpers:
- `src/app/api/_lib/*` — cookie/session helpers, response helpers, Supabase request helpers

Client API wrapper:
- `src/lib/api-client.ts` — typed JSON helper + `ApiError`

### Component-based UI
The UI is decomposed into a small “feature folder”:

- `src/components/todo/TodoPage.tsx` — auth gate + mounts the app
- `src/components/todo/TodoApp.tsx` — main state + orchestration + layout
- `src/components/todo/TaskForm.tsx` — RHF + Zod task form
- `src/components/todo/TaskList.tsx` — grouped list rendering + attachment UI
- `src/components/todo/UserMenu.tsx` — avatar dropdown + logout
- `src/components/todo/AuthCard.tsx` — sign in/up
- `src/components/todo/utils.ts` — date/time helpers + daily load logic
- `src/components/todo/types.ts`, `src/components/todo/schemas.ts`, `src/components/todo/mock-data.ts`

UI toolkit:
- `src/components/ui/*` — shadcn/ui components

## Responsive design & accessibility
- The layout uses Tailwind responsive classes (`sm:*`) to ensure the UI **stacks cleanly on mobile**, and expands naturally on tablet/desktop.
- Common overflow issues are handled with `min-w-0`, `truncate`, and stacked attachment rows on small screens.
- Buttons and controls include `aria-label`s where appropriate (e.g., icon-only actions).
- Inputs are keyboard accessible; dropdown/tooltip components use Radix (via shadcn/ui).

## Setup & running

### Prerequisites
- Node.js (modern LTS recommended)
- A Supabase project (free tier is fine)

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment variables
Create a `.env.local` file in the project root:

```txt
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

You can copy from `supabase.env.example`.

### 3) Create tables, bucket, and policies
In Supabase Dashboard → **SQL Editor**, run:
- `supabase/schema.sql`

### 4) Run the app
```bash
npm run dev
```

Then open the local URL printed by Next.js.

## Notes on design decisions & trade-offs
- **`due_at` stored as a string** (`YYYY-MM-DDTHH:mm`) for simple client-side sorting/filtering and easy `datetime-local` interoperability. A true `timestamptz` would be better for multi-timezone products, but requires more careful UX/timezone handling.
- **Attachments stored as `jsonb`** on the task row to keep the schema lightweight. For large-scale usage, a normalized `task_attachments` table would be more flexible (queries, indexing, analytics).
- **API routes instead of direct Supabase client usage** in UI: improves separation of concerns, centralizes security/session handling, and keeps components focused on presentation/state.
- **Avatar image**: currently uses a deterministic “realistic placeholder” image source in the UI. For production, you’d typically store a user profile record and use Storage or a trusted CDN.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
