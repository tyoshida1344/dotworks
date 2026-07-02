-- 種別: DDL（スキーマ定義＋RLS 変更）
-- 管理者アカウントは Supabase Auth と切り離した独自テーブル（login_id/password）＋
-- セッショントークンで認証する。パスワードは pgcrypto(bcrypt) でハッシュ保存。
-- レッスン／お題画像の書き込みは Edge Function（service_role）経由に一本化し、
-- クライアント（anon）からの直接書き込みは不可にする。読み取りは全員のまま。
-- 学習者アカウント（Supabase Auth／将来 Google）とは完全に分離する。

create extension if not exists pgcrypto with schema extensions;

-- ── admins（独自アカウント） ─────────────────
create table public.admins (
  id          bigint generated always as identity primary key,
  login_id    text not null unique,
  password    text not null,        -- bcrypt ハッシュを格納（平文は入れない）
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
alter table public.admins enable row level security;   -- ポリシー無し＝anon/authenticated からは不可視

-- ── admin_sessions（ログインセッション） ────────
create table public.admin_sessions (
  token      text primary key,
  admin_id   bigint not null references public.admins (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.admin_sessions enable row level security;
create index admin_sessions_admin_id_idx on public.admin_sessions (admin_id);

-- Edge Function（service_role）だけがこれらを読み書きする
grant all on public.admins to service_role;
grant all on public.admin_sessions to service_role;

-- ── パスワードのハッシュ生成（管理者の作成・変更用。Studio/SQL から使う） ──
create or replace function public.admin_hash_password(p_password text)
returns text
language sql
security definer
set search_path = public, extensions
as $$ select crypt(p_password, gen_salt('bf')); $$;

revoke all on function public.admin_hash_password(text) from public;
grant execute on function public.admin_hash_password(text) to service_role;

-- ── ログイン：資格情報を照合し、成功時にセッショントークンを返す（失敗は null） ──
create or replace function public.admin_login(p_login_id text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins;
  v_token text;
begin
  select * into v_admin
    from public.admins
    where login_id = p_login_id and deleted_at is null;
  if v_admin.id is null then
    return null;                                   -- アカウント無し
  end if;
  if v_admin.password <> crypt(p_password, v_admin.password) then
    return null;                                   -- パスワード不一致
  end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.admin_sessions (token, admin_id, expires_at)
    values (v_token, v_admin.id, now() + interval '7 days');
  return v_token;
end;
$$;

revoke all on function public.admin_login(text, text) from public;
grant execute on function public.admin_login(text, text) to service_role;

-- ── lessons：クライアントからの書き込みを禁止（Edge Function=service_role のみ） ──
-- 読み取りは全員（init の "lessons read for all" using(true) を維持）。
drop policy if exists "lessons write for authenticated" on public.lessons;
revoke insert, update, delete on public.lessons from anon, authenticated;
grant select, insert, update, delete on public.lessons to service_role;

-- 並び替え RPC も service_role からのみ
revoke all on function public.reorder_lessons(bigint[]) from public;
revoke all on function public.reorder_lessons(bigint[]) from authenticated;
grant execute on function public.reorder_lessons(bigint[]) to service_role;

-- ── お題画像バケット：クライアント書き込みポリシーを撤去（公開読みは維持） ──
-- 書き込み・削除は Edge Function（署名付きアップロードURL／service_role 削除）で行う。
drop policy if exists "lesson-refs authenticated write" on storage.objects;
drop policy if exists "lesson-refs authenticated update" on storage.objects;
drop policy if exists "lesson-refs authenticated delete" on storage.objects;
