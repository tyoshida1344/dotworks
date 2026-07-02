-- 種別: DDL（スキーマ定義）。付随してバケット作成の DML（insert into storage.buckets）を1つ含む。
-- DOTWORK レッスン管理（イシュー #7）の初期スキーマ。
-- 以後のスキーマ変更（テーブル追加・カラム変更など）は新しいマイグレーションを追加する:
--   npx supabase migration new <name>   → DDL を書く
--   ローカル: npx supabase db reset / db push、本番: npx supabase db push
-- 手順の全体は README.md「レッスン管理（Supabase）」を参照。

-- ── lessons テーブル ─────────────────────────
-- id:         自動採番の安定 PK（更新・削除の対象。フロントでもこの id で識別する）
-- ref:        お題（見本）画像の参照。本番は公開バケットの URL、任意（null 可）
-- deleted_at: 論理削除の時刻。null なら有効、値があれば削除済み（一覧から除外する）
-- description: desc は SQL 予約語のため列名は description（フロントで desc にマップ）
create table if not exists public.lessons (
  id          bigint generated always as identity primary key,
  level       integer not null default 1,
  title       text not null,
  description text not null default '',
  size        integer not null default 16,
  palette     jsonb not null default '[]'::jsonb,
  ref         text,
  sort_order  integer not null default 1,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 一覧は「未削除のみ・sort_order 昇順」で引くので、その条件に効く部分インデックス
create index if not exists lessons_sort_order_idx
  on public.lessons (sort_order) where deleted_at is null;

-- ── RLS: 閲覧は全員、書き込みはログイン済みのみ ──
alter table public.lessons enable row level security;

drop policy if exists "lessons read for all" on public.lessons;
create policy "lessons read for all"
  on public.lessons for select
  using (true);

drop policy if exists "lessons write for authenticated" on public.lessons;
create policy "lessons write for authenticated"
  on public.lessons for all
  to authenticated
  using (true)
  with check (true);

-- ── テーブル権限（Data API ロール）──────────────
-- RLS ポリシーは「どの行を見せるか」を決めるだけで、テーブルへのアクセスには GRANT が要る。
-- Supabase の既定では public の新規テーブルが anon/authenticated へ自動公開されない
-- （config.toml の auto_expose_new_tables 参照）ため、明示的に権限を付与する。
grant select on public.lessons to anon, authenticated;
grant insert, update, delete on public.lessons to authenticated;

-- ── Storage: お題画像の公開バケット ──────────
insert into storage.buckets (id, name, public)
values ('lesson-refs', 'lesson-refs', true)
on conflict (id) do nothing;

drop policy if exists "lesson-refs public read" on storage.objects;
create policy "lesson-refs public read"
  on storage.objects for select
  using (bucket_id = 'lesson-refs');

drop policy if exists "lesson-refs authenticated write" on storage.objects;
create policy "lesson-refs authenticated write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lesson-refs');

drop policy if exists "lesson-refs authenticated update" on storage.objects;
create policy "lesson-refs authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'lesson-refs');

drop policy if exists "lesson-refs authenticated delete" on storage.objects;
create policy "lesson-refs authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lesson-refs');

-- ── 並び替え用 RPC（1 トランザクションで sort_order を振り直す） ──
-- ids の並び順どおりに sort_order を 1..n で更新する。
-- SECURITY INVOKER（既定）なので lessons の RLS が効き、書き込みは authenticated のみ。
create or replace function public.reorder_lessons(ids bigint[])
returns void
language plpgsql
as $$
declare i integer;
begin
  for i in 1 .. coalesce(array_length(ids, 1), 0) loop
    update public.lessons
      set sort_order = i, updated_at = now()
      where id = ids[i];
  end loop;
end;
$$;

revoke all on function public.reorder_lessons(bigint[]) from public;
grant execute on function public.reorder_lessons(bigint[]) to authenticated;
