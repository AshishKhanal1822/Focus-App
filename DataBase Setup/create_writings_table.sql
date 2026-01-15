-- Create a table for user writings
create table public.writings (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    content text,
    title text default 'Untitled Draft'
);

-- Enable RLS
alter table public.writings enable row level security;

-- Create policies
create policy "Users can view their own writings"
    on public.writings for select
    using (auth.uid() = user_id);

create policy "Users can insert their own writings"
    on public.writings for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own writings"
    on public.writings for update
    using (auth.uid() = user_id);

create policy "Users can delete their own writings"
    on public.writings for delete
    using (auth.uid() = user_id);
