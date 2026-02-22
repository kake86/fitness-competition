# Supabase + Gemini Setup

This app can run with either backend:

- `firebase` (default)
- `supabase` (set `VITE_STORAGE_PROVIDER=supabase`)

## 1) Create Supabase table and policies

Run this SQL in your Supabase project SQL editor:

```sql
create table if not exists public.competition_state (
  id integer primary key,
  operatives jsonb not null default '[]'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  user_bindings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.competition_state (id)
values (1)
on conflict (id) do nothing;

alter table public.competition_state enable row level security;

create policy "competition_state_read_authenticated"
on public.competition_state
for select
to authenticated
using (true);

create policy "competition_state_write_authenticated"
on public.competition_state
for all
to authenticated
using (id = 1)
with check (id = 1);
```

## 2) Enable Google Auth in Supabase

In Supabase dashboard:

1. Go to **Authentication → Providers → Google**
2. Enable Google provider
3. Add your app URL callback as instructed by Supabase

## 3) Environment variables

Add these to `.env`:

```bash
VITE_STORAGE_PROVIDER=supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_STATE_TABLE=competition_state
VITE_SUPABASE_STATE_ROW_ID=1
```

Gemini (optional but supported in app):

```bash
VITE_GEMINI_API_KEY=your_google_ai_api_key
VITE_GEMINI_MODEL=gemini-2.0-flash
```

## 4) Run locally

```bash
npm install
npm run dev
```

## Notes

- Each signed-in user claims one player profile and logs their own activity data.
- If Gemini key is configured, the **Match Stats** page shows a **Gemini Coach** panel.
