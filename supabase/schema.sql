-- Cấu trúc Cơ sở dữ liệu Đám mây Supabase cho ProPlanner (Đồng bộ Máy tính & iPhone)
-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> Dán toàn bộ đoạn mã này và nhấn RUN.

create table if not exists public.planner_states (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_states enable row level security;

-- Cho phép đồng bộ nhanh qua Anon Key và Profile Key cá nhân giữa Web App và iPhone
drop policy if exists "Allow public read-write by profile id" on public.planner_states;
create policy "Allow public read-write by profile id"
  on public.planner_states
  for all
  using (true)
  with check (true);

-- Bật Realtime cho bảng planner_states
alter publication supabase_realtime add table public.planner_states;
