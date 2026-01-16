-- Create reviews table
create table public.reviews (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) on delete cascade,
    name text not null,
    role text,
    review_text text not null,
    rating integer not null check (rating >= 1 and rating <= 5),
    is_approved boolean default false
);

-- Enable RLS
alter table public.reviews enable row level security;

-- Policies
create policy "Anyone can view approved reviews"
    on public.reviews for select
    using (is_approved = true);

create policy "Users can insert their own reviews"
    on public.reviews for insert
    with check (auth.uid() = user_id);

create policy "Users can view their own reviews"
    on public.reviews for select
    using (auth.uid() = user_id);

-- Index for performance
create index reviews_approved_idx on public.reviews(is_approved, created_at desc);
