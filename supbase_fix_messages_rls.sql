-- Run this in your Supabase SQL Editor to allow anyone to send messages
-- (This fixes the "row-level security policy" error on the Contact form)

-- 1. Enable RLS on the table (good practice to ensure it's on)
alter table "public"."messages" enable row level security;

-- 2. Create a policy to allow anonymous inserts
create policy "Enable insert for all users"
on "public"."messages"
as PERMISSIVE
for INSERT
to public
with check (true);

-- 3. (Optional) If you want users to be able to read their own messages, you'd add:
-- create policy "Users can view their own messages" on "public"."messages" for select using (true); 
-- But usually contact form messages are private to admins only.
