-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Reset: Drop existing policies to avoid conflicts
drop policy if exists "Enable insert for all users" on "public"."messages";
drop policy if exists "Allow anonymous insert" on "public"."messages";
drop policy if exists "Allow authenticated insert" on "public"."messages";

-- 2. Ensure RLS is enabled
alter table "public"."messages" enable row level security;

-- 3. Create a permissive policy for INSERT only (covers both anon and logged-in users)
create policy "Allow public insert"
on "public"."messages"
for INSERT
to public
with check (true);

-- 4. Grant usage on the sequence (often needed for serial IDs if they exist)
grant usage, select on all sequences in schema public to anon, authenticated;
grant insert on "public"."messages" to anon, authenticated;
