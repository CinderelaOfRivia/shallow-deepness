create extension if not exists pgcrypto;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  excerpt text not null,
  body_md text not null,
  language text not null check (language in ('es', 'en')) default 'es',
  status text not null check (status in ('draft', 'published')) default 'draft',
  cover_image_url text,
  tags text[] not null default '{}',
  featured boolean not null default false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_idx on public.articles(status);
create index if not exists articles_published_at_idx on public.articles(published_at desc nulls last);
create index if not exists articles_tags_idx on public.articles using gin(tags);

create table if not exists public.idea_bank (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  angle text not null,
  why_now text not null,
  status text not null check (status in ('seed', 'exploring', 'drafting', 'published', 'paused')) default 'seed',
  notes text,
  source_article_slug text references public.articles(slug) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idea_bank_status_idx on public.idea_bank(status);
create index if not exists idea_bank_created_at_idx on public.idea_bank(created_at desc);

create table if not exists public.article_ai_runs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete set null,
  workflow text not null check (workflow in ('feedback', 'steelman', 'editorial')),
  intensity text not null check (intensity in ('default', 'heavy')),
  model_name text not null,
  source_payload jsonb not null,
  output_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists article_ai_runs_article_id_idx on public.article_ai_runs(article_id);
create index if not exists article_ai_runs_created_at_idx on public.article_ai_runs(created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_touch_updated_at on public.articles;
create trigger articles_touch_updated_at
before update on public.articles
for each row execute function public.touch_updated_at();

drop trigger if exists idea_bank_touch_updated_at on public.idea_bank;
create trigger idea_bank_touch_updated_at
before update on public.idea_bank
for each row execute function public.touch_updated_at();

alter table public.articles enable row level security;
alter table public.idea_bank enable row level security;
alter table public.article_ai_runs enable row level security;

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
on public.articles
for select
using (status = 'published');

drop policy if exists "Public can read idea bank" on public.idea_bank;
create policy "Public can read idea bank"
on public.idea_bank
for select
using (true);

-- The admin studio writes through server actions using the service role key.
-- No public policy for article_ai_runs on purpose.
