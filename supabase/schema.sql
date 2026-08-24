-- Already run in Supabase SQL editor, but saved here for reference
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  is_pro boolean default false,
  stripe_customer_id text,
  created_at timestamp with time zone default now()
);

create table if not exists habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text not null default 'moss',
  created_at date not null default current_date
);

create table if not exists checkins (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references habits on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  unique (habit_id, date)
);

alter table profiles enable row level security;
alter table habits enable row level security;
alter table checkins enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id);

create policy "own habits" on habits
  for all using (auth.uid() = user_id);

create policy "own checkins" on checkins
  for all using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
