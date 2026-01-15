-- Create tasks table
create table public.tasks (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    text text not null,
    completed boolean default false
);

-- Enable RLS
alter table public.tasks enable row level security;

-- Policies
create policy "Users can view their own tasks"
    on public.tasks for select
    using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
    on public.tasks for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
    on public.tasks for update
    using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
    on public.tasks for delete
    using (auth.uid() = user_id);
