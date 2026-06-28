-- 월 정기구독(Toss 빌링) 스키마 — user-front Supabase 프로젝트에서 실행.
-- 빌링키(billing_key) = "등록된 결제수단". 정기 청구는 서버(service_role)가 billing_key로 수행.

create table if not exists public.subscriptions (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  billing_key       text not null,            -- Toss 빌링키(결제수단)
  customer_key      text not null,            -- Toss customerKey (= user_id)
  status            text not null default 'active',   -- active | canceled | past_due
  amount            integer not null default 33000,   -- 월 구독료(KRW)
  started_at        timestamptz not null default now(),
  next_billing_date timestamptz not null,     -- 다음 청구 예정일(혜택 만료일)
  last_charged_at   timestamptz,
  canceled_at       timestamptz,              -- 해지 신청 시각(혜택은 next_billing_date까지 유지)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 유저당 active 구독 1개만
create unique index if not exists subscriptions_one_active
  on public.subscriptions (user_id) where status = 'active';

create index if not exists subscriptions_due
  on public.subscriptions (next_billing_date) where status = 'active';

-- RLS: 본인 구독만 조회(클라 ON/OFF 표시). 모든 쓰기는 서버(service_role)만.
alter table public.subscriptions enable row level security;

drop policy if exists "own subscriptions read" on public.subscriptions;
create policy "own subscriptions read" on public.subscriptions
  for select using (auth.uid() = user_id);
