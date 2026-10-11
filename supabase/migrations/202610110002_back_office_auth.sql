-- Additive back-office roles, permissions, invitations and audit history.
begin;

create type public.back_office_role as enum ('pending','admin','super_admin');
create type public.back_office_status as enum ('pending','active','revoked');
create type public.back_office_permission as enum ('view_back_office','manage_media','publish_content','invite_admins');

create table public.back_office_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (email = lower(email)),
  role public.back_office_role not null default 'pending',
  status public.back_office_status not null default 'pending',
  permissions public.back_office_permission[] not null default '{}',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint super_admin_has_all_permissions check (role <> 'super_admin' or permissions @> array['view_back_office','manage_media','publish_content','invite_admins']::public.back_office_permission[]),
  constraint pending_has_no_permissions check (role <> 'pending' or cardinality(permissions)=0)
);
create unique index back_office_access_email on public.back_office_access(lower(email));

create table public.back_office_invitations (
  id uuid primary key default gen_random_uuid(), email text not null check(email=lower(email)),
  permissions public.back_office_permission[] not null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check(status in ('pending','accepted','revoked','failed')),
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), accepted_at timestamptz, revoked_at timestamptz
);
create unique index back_office_one_pending_invitation on public.back_office_invitations(lower(email)) where status='pending';

create table public.back_office_audit_log (
  id bigint generated always as identity primary key, actor_user_id uuid references auth.users(id) on delete set null,
  action text not null, target_user_id uuid references auth.users(id) on delete set null,
  target_email text, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index back_office_audit_recent on public.back_office_audit_log(created_at desc);

alter table public.back_office_access enable row level security;
alter table public.back_office_invitations enable row level security;
alter table public.back_office_audit_log enable row level security;
revoke all on public.back_office_access, public.back_office_invitations, public.back_office_audit_log from anon, authenticated;
grant select on public.back_office_access to authenticated;
grant select on public.back_office_invitations, public.back_office_audit_log to authenticated;

create function public.back_office_has_permission(required public.back_office_permission)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.back_office_access where user_id=(select auth.uid()) and status='active' and role in ('admin','super_admin') and (role='super_admin' or required=any(permissions)));
$$;
revoke all on function public.back_office_has_permission(public.back_office_permission) from public;
grant execute on function public.back_office_has_permission(public.back_office_permission) to authenticated;

create function public.back_office_is_super_admin()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.back_office_access where user_id=(select auth.uid()) and role='super_admin' and status='active');
$$;
revoke all on function public.back_office_is_super_admin() from public;
grant execute on function public.back_office_is_super_admin() to authenticated;

create policy "Users read own active or pending access" on public.back_office_access for select to authenticated using(user_id=(select auth.uid()));
create policy "Super admins read access roster" on public.back_office_access for select to authenticated using(public.back_office_is_super_admin());
create policy "Inviters read own invitations" on public.back_office_invitations for select to authenticated using(invited_by=(select auth.uid()));
create policy "Super admins read invitations" on public.back_office_invitations for select to authenticated using(public.back_office_is_super_admin());
create policy "Super admins read audit log" on public.back_office_audit_log for select to authenticated using(public.back_office_is_super_admin());

create function public.register_back_office_signup() returns trigger language plpgsql security definer set search_path='' as $$
declare invitation public.back_office_invitations;
begin
 select * into invitation from public.back_office_invitations where email=lower(new.email) and status='pending' order by created_at desc limit 1;
 if invitation.id is not null then
  insert into public.back_office_access(user_id,email,role,status,permissions,invited_by) values(new.id,lower(new.email),'admin','active',invitation.permissions,invitation.invited_by)
  on conflict(user_id) do update set role='admin',status='active',permissions=excluded.permissions,invited_by=excluded.invited_by,updated_at=now();
  update public.back_office_invitations set status='accepted',auth_user_id=new.id,accepted_at=now() where id=invitation.id;
  insert into public.back_office_audit_log(actor_user_id,action,target_user_id,target_email,details) values(invitation.invited_by,'invitation_accepted',new.id,lower(new.email),jsonb_build_object('permissions',invitation.permissions));
 else
  insert into public.back_office_access(user_id,email) values(new.id,lower(new.email)) on conflict(user_id) do nothing;
 end if;
 return new;
end; $$;
create trigger register_back_office_signup after insert on auth.users for each row execute function public.register_back_office_signup();

create function public.prepare_back_office_invitation(invitee_email text, requested public.back_office_permission[])
returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.back_office_access; invitation_id uuid;
begin
 select * into actor from public.back_office_access where user_id=(select auth.uid()) and status='active';
 if actor.role not in ('admin','super_admin') or not ('invite_admins'=any(actor.permissions) or actor.role='super_admin') then raise exception 'Permission denied' using errcode='42501'; end if;
 requested:=array(select distinct unnest(requested));
 if not ('view_back_office'=any(requested)) then raise exception 'View permission is required'; end if;
 if actor.role<>'super_admin' and not requested <@ actor.permissions then raise exception 'Cannot grant permissions you do not possess' using errcode='42501'; end if;
 if exists(select 1 from public.back_office_access where email=lower(invitee_email) and role='super_admin') then raise exception 'Super administrator cannot be modified' using errcode='42501'; end if;
 insert into public.back_office_invitations(email,permissions,invited_by) values(lower(invitee_email),requested,actor.user_id) returning id into invitation_id;
 insert into public.back_office_audit_log(actor_user_id,action,target_email,details) values(actor.user_id,'administrator_invited',lower(invitee_email),jsonb_build_object('permissions',requested,'invitation_id',invitation_id));
 return invitation_id;
end; $$;
revoke all on function public.prepare_back_office_invitation(text,public.back_office_permission[]) from public;
grant execute on function public.prepare_back_office_invitation(text,public.back_office_permission[]) to authenticated;

create function public.manage_back_office_admin(target uuid, requested public.back_office_permission[], next_status public.back_office_status)
returns void language plpgsql security definer set search_path='' as $$
declare actor public.back_office_access; subject public.back_office_access;
begin
 select * into actor from public.back_office_access where user_id=(select auth.uid()) and role='super_admin' and status='active';
 if actor.user_id is null then raise exception 'Super administrator required' using errcode='42501'; end if;
 select * into subject from public.back_office_access where user_id=target for update;
 if subject.user_id is null then raise exception 'Administrator not found'; end if;
 if subject.role='super_admin' or subject.user_id=actor.user_id then raise exception 'Super administrator cannot be modified' using errcode='42501'; end if;
 if next_status not in ('active','revoked') then raise exception 'Invalid status'; end if;
 requested:=array(select distinct unnest(requested));
 if next_status='active' and not ('view_back_office'=any(requested)) then raise exception 'View permission is required'; end if;
 update public.back_office_access set role='admin',status=next_status,permissions=case when next_status='revoked' then '{}' else requested end,updated_at=now() where user_id=target;
 insert into public.back_office_audit_log(actor_user_id,action,target_user_id,target_email,details) values(actor.user_id,case when next_status='revoked' then 'administrator_revoked' else 'administrator_permissions_changed' end,target,subject.email,jsonb_build_object('permissions',requested));
end; $$;
revoke all on function public.manage_back_office_admin(uuid,public.back_office_permission[],public.back_office_status) from public;
grant execute on function public.manage_back_office_admin(uuid,public.back_office_permission[],public.back_office_status) to authenticated;

-- Existing explicitly provisioned media administrators retain media access as admins.
insert into public.back_office_access(user_id,email,role,status,permissions)
select u.id,lower(u.email),'admin','active',array['view_back_office','manage_media','publish_content']::public.back_office_permission[] from auth.users u join public.portfolio_media_admins p on p.user_id=u.id
on conflict(user_id) do nothing;

drop policy if exists "Administrators manage media" on public.portfolio_media;
create policy "Back office administrators manage media" on public.portfolio_media for all to authenticated
using(public.back_office_has_permission('manage_media') and (not published or public.back_office_has_permission('publish_content')))
with check(public.back_office_has_permission('manage_media') and (not published or public.back_office_has_permission('publish_content')));
commit;
