-- Enable RLS
alter table if exists public.claims enable row level security;

-- Create claims table
create table if not exists public.claims (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  tenant_name text not null,
  category text not null check (category in ('water', 'electric', 'equipment', 'noise', 'other')),
  priority text not null default 'normal' check (priority in ('urgent', 'high', 'normal', 'low')),
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
create policy "Users can only access their own claims"
  on public.claims
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable realtime
alter publication supabase_realtime add table public.claims;
