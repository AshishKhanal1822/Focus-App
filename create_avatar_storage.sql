-- Drop existing policies if they exist (safe to run multiple times)
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

-- Create storage bucket for avatars (if not exists)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Create fresh policies
create policy "Avatar images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar"
on storage.objects for insert
with check ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can update their own avatar"
on storage.objects for update
using ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can delete their own avatar"
on storage.objects for delete
using ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
