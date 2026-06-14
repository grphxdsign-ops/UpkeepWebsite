create table if not exists public.upkeep_documents (
  id text primary key,
  name text not null,
  file_type text not null default 'text/plain',
  file_size bigint not null default 0,
  status text not null default 'prepared',
  source_text text not null default '',
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.upkeep_records (
  id text primary key,
  document_id text references public.upkeep_documents(id) on delete cascade,
  document_name text not null default '',
  record_type text not null default 'document',
  category text not null default 'Uncategorized business expense',
  title text not null,
  description text not null default '',
  details_reference text not null default '',
  deposit numeric(14, 2),
  withdrawal numeric(14, 2),
  amount numeric(14, 2),
  record_date text,
  status text not null default 'needs_review',
  confidence integer not null default 0,
  needs_review boolean not null default true,
  review_note text not null default '',
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.upkeep_records
  add column if not exists category text not null default 'Uncategorized business expense';
alter table public.upkeep_records
  add column if not exists details_reference text not null default '';
alter table public.upkeep_records
  add column if not exists deposit numeric(14, 2);
alter table public.upkeep_records
  add column if not exists withdrawal numeric(14, 2);

create index if not exists upkeep_documents_created_at_idx
  on public.upkeep_documents (created_at desc);

create index if not exists upkeep_records_created_at_idx
  on public.upkeep_records (created_at desc);

create index if not exists upkeep_records_document_id_idx
  on public.upkeep_records (document_id);

create index if not exists upkeep_records_review_idx
  on public.upkeep_records (needs_review, status)
  where needs_review = true or status = 'needs_review';

create table if not exists public.upkeep_exports (
  id text primary key,
  name text not null,
  export_type text not null default 'records',
  file_type text not null default 'csv',
  record_count integer not null default 0,
  source_record_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.upkeep_exports
  add column if not exists source_record_ids jsonb not null default '[]'::jsonb;

create index if not exists upkeep_exports_created_at_idx
  on public.upkeep_exports (created_at desc);

alter table public.upkeep_documents enable row level security;
alter table public.upkeep_records enable row level security;
alter table public.upkeep_exports enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.upkeep_documents to service_role;
grant select, insert, update, delete on public.upkeep_records to service_role;
grant select, insert, update, delete on public.upkeep_exports to service_role;

-- The Node backend is designed to use SUPABASE_SERVICE_ROLE_KEY only.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY to browser code.
-- Add user-scoped policies and anon/authenticated grants later if this becomes a direct browser-to-Supabase app.
