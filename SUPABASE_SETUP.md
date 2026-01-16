## Supabase setup (auth + tasks + storage)

### 1) Add env vars
Create a `.env.local` file in the project root with:

```txt
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

You can copy from `supabase.env.example`.

### 2) Create DB tables + policies
In Supabase Dashboard:
- Go to **SQL Editor**
- Paste and run the SQL from `supabase/schema.sql`

### 3) Create the storage bucket
The SQL also creates a bucket named **`task-attachments`** and policies.

