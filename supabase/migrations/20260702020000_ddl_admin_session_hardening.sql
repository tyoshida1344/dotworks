-- 種別: DDL（関数の更新）
-- ログインの堅牢化:
--  - セッショントークンは sha256 ハッシュで保存する（DB 漏洩時に生トークンを流用させない）。
--    生トークンはクライアントにだけ返し、DB にはハッシュのみ置く。
--  - ログインのたびに期限切れセッションを掃除する（行の溜まり込み防止）。
--  - アカウントの有無でタイミング差が出ないよう、未存在でも必ずハッシュ照合を1回行う。
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
  -- 期限切れセッションの掃除（軽い housekeeping）
  delete from public.admin_sessions where expires_at <= now();

  select * into v_admin
    from public.admins
    where login_id = p_login_id and deleted_at is null;

  -- タイミング差でアカウントの有無が漏れないよう、未存在でも必ずハッシュ照合を1回行う
  if v_admin.id is null then
    perform crypt(p_password, gen_salt('bf'));
    return null;
  end if;

  if v_admin.password <> crypt(p_password, v_admin.password) then
    return null;
  end if;

  -- 生トークンを返し、DB には sha256 ハッシュのみ保存する
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.admin_sessions (token, admin_id, expires_at)
    values (encode(digest(v_token, 'sha256'), 'hex'), v_admin.id, now() + interval '7 days');
  return v_token;
end;
$$;
