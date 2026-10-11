-- Run once in Supabase SQL Editor. Transactional and additive; never drops existing objects.
begin;
create table public.portfolio_media_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.portfolio_media_admins enable row level security;
revoke all on public.portfolio_media_admins from anon, authenticated;
grant select on public.portfolio_media_admins to authenticated;
create policy "Administrators can inspect own membership"
  on public.portfolio_media_admins for select to authenticated
  using (user_id = (select auth.uid()));
-- No client INSERT/UPDATE/DELETE grants or policies: membership is SQL-owner provisioned.
create function public.portfolio_is_media_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.portfolio_media_admins where user_id = (select auth.uid())); $$;
revoke all on function public.portfolio_is_media_admin() from public;
grant execute on function public.portfolio_is_media_admin() to authenticated;

create table public.portfolio_media (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 250),
  description text not null default '' check (length(description) <= 4000),
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null check (length(media_url) <= 2048 and media_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'),
  thumbnail_url text check (thumbnail_url is null or (length(thumbnail_url) <= 2048 and thumbnail_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$')),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_supported_video check (
    media_type = 'image'
    or media_url ~* '^https://[^/?#]+/[^?#]*\.(mp4|webm|ogg)([?#].*)?$'
    or media_url ~ '^https://(www\.|m\.)?youtube\.com/(watch\?[^[:space:]]*v=[A-Za-z0-9_-]{11}([&#].*)?|(embed|shorts|live)/[A-Za-z0-9_-]{11}([/?#].*)?)$'
    or media_url ~ '^https://(www\.)?youtube-nocookie\.com/embed/[A-Za-z0-9_-]{11}([/?#].*)?$'
    or media_url ~ '^https://youtu\.be/[A-Za-z0-9_-]{11}([/?#].*)?$'
    or media_url ~ '^https://(www\.)?vimeo\.com/[0-9]+([/?#].*)?$'
    or media_url ~ '^https://player\.vimeo\.com/video/[0-9]+([/?#].*)?$'
    or media_url ~ '^https://drive\.google\.com/(file/d/[A-Za-z0-9_-]+([/?#].*)?|(open|uc)\?[^[:space:]]*id=[A-Za-z0-9_-]+([&#].*)?)$'
  )
);
create index portfolio_media_public_order on public.portfolio_media(display_order, created_at, id) where published;
create index portfolio_media_admin_order on public.portfolio_media(display_order, created_at, id);
create function public.portfolio_media_timestamps()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if TG_OP = 'UPDATE' then new.created_at := old.created_at; end if;
  return new;
end; $$;
create trigger portfolio_media_timestamps before insert or update on public.portfolio_media
for each row execute function public.portfolio_media_timestamps();
alter table public.portfolio_media enable row level security;
revoke all on public.portfolio_media from anon, authenticated;
grant select on public.portfolio_media to anon, authenticated;
grant insert, update, delete on public.portfolio_media to authenticated;
create policy "Visitors read published media" on public.portfolio_media for select to anon, authenticated using (published);
create policy "Administrators manage media" on public.portfolio_media for all to authenticated
using ((select public.portfolio_is_media_admin()))
with check ((select public.portfolio_is_media_admin()));

-- Normalize and move in a single transaction; serialize concurrent reorder requests.
create function public.portfolio_move_media(target_id uuid, direction integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare target_order integer; neighbor_id uuid; neighbor_order integer;
begin
  if not public.portfolio_is_media_admin() then raise exception 'Administrator required' using errcode = '42501'; end if;
  if direction not in (-1, 1) then raise exception 'Invalid direction'; end if;
  perform pg_advisory_xact_lock(87341001);
  perform id from public.portfolio_media order by id for update;
  with ranked as (
    select id, (row_number() over(order by display_order, created_at, id) - 1)::integer as position
    from public.portfolio_media
  ) update public.portfolio_media m set display_order = r.position from ranked r where r.id = m.id;
  select display_order into target_order from public.portfolio_media where id = target_id;
  if target_order is null then raise exception 'Media not found'; end if;
  select id, display_order into neighbor_id, neighbor_order from public.portfolio_media where display_order = target_order + direction;
  if neighbor_id is not null then
    update public.portfolio_media set display_order = case when id = target_id then neighbor_order else target_order end
    where id in (target_id, neighbor_id);
  end if;
end; $$;
revoke all on function public.portfolio_move_media(uuid, integer) from public;
grant execute on function public.portfolio_move_media(uuid, integer) to authenticated;
commit;
