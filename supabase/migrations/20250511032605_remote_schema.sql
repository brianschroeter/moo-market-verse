drop trigger if exists "on_discord_guilds_updated" on "public"."discord_guilds";

drop trigger if exists "on_profiles_updated" on "public"."profiles";

drop trigger if exists "on_support_tickets_updated" on "public"."support_tickets";

drop trigger if exists "on_ticket_messages_updated" on "public"."ticket_messages";

drop trigger if exists "on_youtube_connections_updated" on "public"."youtube_connections";

drop trigger if exists "on_youtube_memberships_updated" on "public"."youtube_memberships";

drop policy "Public profiles are viewable by everyone." on "public"."profiles";

drop policy "Users can delete their own profile." on "public"."profiles";

drop policy "Users can insert their own profile." on "public"."profiles";

drop policy "Users can update their own profile." on "public"."profiles";

drop policy "Users can create support tickets." on "public"."support_tickets";

drop policy "Users can update their own support tickets if not resolved or c" on "public"."support_tickets";

drop policy "Users can view their own support tickets." on "public"."support_tickets";

drop policy "Admins can manage all ticket attachments." on "public"."ticket_attachments";

drop policy "Users can delete their own attachments if ticket is open." on "public"."ticket_attachments";

drop policy "Users can insert attachments for their own tickets if ticket is" on "public"."ticket_attachments";

drop policy "Users can view attachments for their own tickets." on "public"."ticket_attachments";

drop policy "Admins can manage all ticket messages." on "public"."ticket_messages";

drop policy "Users can insert messages for their own tickets if ticket is op" on "public"."ticket_messages";

drop policy "Users can view messages for their own tickets." on "public"."ticket_messages";

drop policy "Admins can view all user roles" on "public"."user_roles";

drop policy "Users can view their own roles." on "public"."user_roles";

drop policy "Admins can view all YouTube connections." on "public"."youtube_connections";

drop policy "Users can manage their own YouTube connections." on "public"."youtube_connections";

drop policy "Admins can manage YouTube membership records." on "public"."youtube_memberships";

drop policy "Admins can view all YouTube memberships." on "public"."youtube_memberships";

drop policy "Users can view their own YouTube memberships." on "public"."youtube_memberships";

drop policy "Admins can view all discord connections" on "public"."discord_connections";

drop policy "Admins can view all discord guilds" on "public"."discord_guilds";

drop policy "Allow admin write access" on "public"."menu_items";

alter table "public"."profiles" drop constraint "profiles_discord_id_key";

alter table "public"."profiles" drop constraint "username_length";

alter table "public"."support_tickets" drop constraint "support_tickets_assigned_to_user_id_fkey";

alter table "public"."ticket_attachments" drop constraint "ticket_attachments_file_path_key";

alter table "public"."ticket_attachments" drop constraint "ticket_attachments_user_id_fkey";

alter table "public"."ticket_messages" drop constraint "ticket_messages_user_id_fkey";

alter table "public"."youtube_memberships" drop constraint "youtube_memberships_user_id_fkey";

alter table "public"."youtube_memberships" drop constraint "youtube_memberships_user_id_youtube_channel_id_key";

alter table "public"."support_tickets" drop constraint "support_tickets_status_check";

drop view if exists "public"."profiles_with_guild_info";

alter table "public"."user_roles" drop constraint "user_roles_pkey";

drop index if exists "public"."idx_discord_guilds_guild_id";

drop index if exists "public"."idx_discord_guilds_user_id";

drop index if exists "public"."idx_profiles_discord_id";

drop index if exists "public"."idx_profiles_username";

drop index if exists "public"."idx_support_tickets_priority";

drop index if exists "public"."idx_support_tickets_status";

drop index if exists "public"."idx_support_tickets_user_id";

drop index if exists "public"."idx_ticket_attachments_message_id";

drop index if exists "public"."idx_ticket_attachments_ticket_id";

drop index if exists "public"."idx_ticket_attachments_user_id";

drop index if exists "public"."idx_ticket_messages_ticket_id";

drop index if exists "public"."idx_ticket_messages_user_id";

drop index if exists "public"."idx_user_roles_role";

drop index if exists "public"."idx_user_roles_user_id";

drop index if exists "public"."idx_youtube_connections_user_id";

drop index if exists "public"."idx_youtube_connections_youtube_channel_id";

drop index if exists "public"."idx_youtube_memberships_channel_id";

drop index if exists "public"."idx_youtube_memberships_user_id";

drop index if exists "public"."profiles_discord_id_key";

drop index if exists "public"."ticket_attachments_file_path_key";

drop index if exists "public"."youtube_memberships_user_id_youtube_channel_id_key";

drop index if exists "public"."user_roles_pkey";

alter table "public"."user_roles" alter column "role" drop default;

alter type "public"."user_role" rename to "user_role__old_version_to_be_dropped";

create type "public"."user_role" as enum ('admin', 'user');

create table "public"."announcements" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "content" text not null,
    "is_important" boolean default false,
    "active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."announcements" enable row level security;

create table "public"."newsletter_signups" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."user_roles" alter column role type "public"."user_role" using role::text::"public"."user_role";

alter table "public"."user_roles" alter column "role" drop default;

-- Drop the old function that depends on the old type
DROP FUNCTION IF EXISTS assign_admin_role(uuid, user_role__old_version_to_be_dropped);

-- Update the assign_admin_role function to use the new type
CREATE OR REPLACE FUNCTION assign_admin_role(target_user_id uuid, target_role public.user_role)
RETURNS VOID AS $$
BEGIN
  -- Only allow admins to run this function
  IF NOT (auth.uid() IS NOT NULL AND is_admin()) THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;

  -- Insert or update the user role
  INSERT INTO user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, target_role, auth.uid())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    assigned_by = EXCLUDED.assigned_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

drop type "public"."user_role__old_version_to_be_dropped";

alter table "public"."discord_connections" enable row level security;

alter table "public"."discord_guilds" drop column "created_at";

alter table "public"."discord_guilds" drop column "icon_url";

alter table "public"."discord_guilds" drop column "owner_id";

alter table "public"."discord_guilds" drop column "permissions";

alter table "public"."discord_guilds" drop column "updated_at";

alter table "public"."discord_guilds" add column "joined_at" timestamp with time zone not null default now();

alter table "public"."discord_guilds" alter column "guild_name" set not null;

alter table "public"."profiles" drop column "username";

alter table "public"."profiles" alter column "created_at" set not null;

alter table "public"."profiles" alter column "discord_id" set not null;

alter table "public"."profiles" alter column "discord_username" set not null;

alter table "public"."profiles" alter column "updated_at" set default now();

alter table "public"."profiles" alter column "updated_at" set not null;

alter table "public"."support_tickets" drop column "assigned_to_user_id";

alter table "public"."support_tickets" drop column "description";

alter table "public"."support_tickets" drop column "priority";

alter table "public"."support_tickets" drop column "resolved_at";

alter table "public"."support_tickets" alter column "status" set data type text using "status"::text;

alter table "public"."support_tickets" alter column "status" set default 'open';

alter table "public"."ticket_attachments" drop column "file_size_bytes";

alter table "public"."ticket_attachments" drop column "user_id";

alter table "public"."ticket_attachments" add column "file_size" integer not null;

alter table "public"."ticket_attachments" alter column "file_type" set not null;

alter table "public"."ticket_messages" drop column "body";

alter table "public"."ticket_messages" drop column "user_id";

alter table "public"."ticket_messages" add column "content" text not null;

alter table "public"."ticket_messages" alter column "updated_at" drop not null;

alter table "public"."user_roles" drop column "assigned_at";

alter table "public"."user_roles" add column "created_at" timestamp with time zone not null default now();

alter table "public"."user_roles" add column "id" uuid not null default gen_random_uuid();

alter table "public"."user_roles" alter column "role" set default 'user'::user_role;

alter table "public"."youtube_connections" drop column "access_token";

alter table "public"."youtube_connections" drop column "expires_at";

alter table "public"."youtube_connections" drop column "refresh_token";

alter table "public"."youtube_connections" drop column "scopes";

alter table "public"."youtube_connections" drop column "youtube_channel_avatar_url";

alter table "public"."youtube_connections" add column "is_verified" boolean default false;

alter table "public"."youtube_connections" add column "youtube_avatar" text;

alter table "public"."youtube_connections" alter column "youtube_channel_name" set not null;

alter table "public"."youtube_memberships" drop column "last_checked_at";

alter table "public"."youtube_memberships" drop column "member_level";

alter table "public"."youtube_memberships" drop column "started_at";

alter table "public"."youtube_memberships" drop column "user_id";

alter table "public"."youtube_memberships" drop column "youtube_channel_id";

alter table "public"."youtube_memberships" add column "membership_level" text not null;

alter table "public"."youtube_memberships" alter column "channel_name" set not null;

alter table "public"."youtube_memberships" alter column "youtube_connection_id" set not null;

drop type "public"."ticket_priority";

drop type "public"."ticket_status";

CREATE UNIQUE INDEX announcements_pkey ON public.announcements USING btree (id);

CREATE UNIQUE INDEX newsletter_signups_email_key ON public.newsletter_signups USING btree (email);

CREATE UNIQUE INDEX newsletter_signups_pkey ON public.newsletter_signups USING btree (id);

CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

alter table "public"."announcements" add constraint "announcements_pkey" PRIMARY KEY using index "announcements_pkey";

alter table "public"."newsletter_signups" add constraint "newsletter_signups_pkey" PRIMARY KEY using index "newsletter_signups_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."newsletter_signups" add constraint "newsletter_signups_email_key" UNIQUE using index "newsletter_signups_email_key";

alter table "public"."user_roles" add constraint "user_roles_user_id_role_key" UNIQUE using index "user_roles_user_id_role_key";

alter table "public"."support_tickets" add constraint "support_tickets_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'awaiting_support'::text, 'awaiting_user'::text, 'replied'::text, 'closed'::text]))) not valid;

alter table "public"."support_tickets" validate constraint "support_tickets_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_discord_missing_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  provider_id TEXT;
  placeholder_email TEXT;
BEGIN
  -- Check if the provider is Discord and email is NULL
  IF NEW.raw_app_meta_data ->> 'provider' = 'discord' AND NEW.email IS NULL THEN
    -- Attempt to get the Discord provider ID from raw_user_meta_data
    provider_id := NEW.raw_user_meta_data ->> 'provider_id';

    -- If provider_id is found, construct a placeholder email
    IF provider_id IS NOT NULL AND provider_id <> '' THEN
      placeholder_email := 'discord_' || provider_id || '@placeholder.lolcow.co';

      -- Update the email in auth.users for the new user
      -- We need to use SECURITY DEFINER or grant UPDATE on auth.users to postgres
      -- SECURITY DEFINER is simpler here and commonly used for auth triggers.
      UPDATE auth.users
      SET email = placeholder_email,
          email_confirmed_at = now() -- Consider auto-confirming placeholder emails
      WHERE id = NEW.id;

      -- Log the change (optional, requires extension like pgaudit or custom logging table)
      -- RAISE LOG 'Placeholder email set for Discord user %', NEW.id;
    ELSE
      -- Log or handle cases where provider_id is missing (should not happen for OAuth)
      -- RAISE WARNING 'Could not generate placeholder email for Discord user %: provider_id missing', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$
;

create or replace view "public"."profiles_with_guild_info" as  SELECT p.id,
    p.created_at,
    p.discord_id,
    p.discord_username,
    p.discord_avatar,
    COALESCE(gc.guild_count, (0)::bigint) AS guild_count
   FROM (profiles p
     LEFT JOIN ( SELECT ug.user_id,
            count(ug.guild_id) AS guild_count
           FROM discord_guilds ug
          GROUP BY ug.user_id) gc ON ((p.id = gc.user_id)));


grant delete on table "public"."announcements" to "anon";

grant insert on table "public"."announcements" to "anon";

grant references on table "public"."announcements" to "anon";

grant select on table "public"."announcements" to "anon";

grant trigger on table "public"."announcements" to "anon";

grant truncate on table "public"."announcements" to "anon";

grant update on table "public"."announcements" to "anon";

grant delete on table "public"."announcements" to "authenticated";

grant insert on table "public"."announcements" to "authenticated";

grant references on table "public"."announcements" to "authenticated";

grant select on table "public"."announcements" to "authenticated";

grant trigger on table "public"."announcements" to "authenticated";

grant truncate on table "public"."announcements" to "authenticated";

grant update on table "public"."announcements" to "authenticated";

grant delete on table "public"."announcements" to "service_role";

grant insert on table "public"."announcements" to "service_role";

grant references on table "public"."announcements" to "service_role";

grant select on table "public"."announcements" to "service_role";

grant trigger on table "public"."announcements" to "service_role";

grant truncate on table "public"."announcements" to "service_role";

grant update on table "public"."announcements" to "service_role";

grant delete on table "public"."newsletter_signups" to "anon";

grant insert on table "public"."newsletter_signups" to "anon";

grant references on table "public"."newsletter_signups" to "anon";

grant select on table "public"."newsletter_signups" to "anon";

grant trigger on table "public"."newsletter_signups" to "anon";

grant truncate on table "public"."newsletter_signups" to "anon";

grant update on table "public"."newsletter_signups" to "anon";

grant delete on table "public"."newsletter_signups" to "authenticated";

grant insert on table "public"."newsletter_signups" to "authenticated";

grant references on table "public"."newsletter_signups" to "authenticated";

grant select on table "public"."newsletter_signups" to "authenticated";

grant trigger on table "public"."newsletter_signups" to "authenticated";

grant truncate on table "public"."newsletter_signups" to "authenticated";

grant update on table "public"."newsletter_signups" to "authenticated";

grant delete on table "public"."newsletter_signups" to "service_role";

grant insert on table "public"."newsletter_signups" to "service_role";

grant references on table "public"."newsletter_signups" to "service_role";

grant select on table "public"."newsletter_signups" to "service_role";

grant trigger on table "public"."newsletter_signups" to "service_role";

grant truncate on table "public"."newsletter_signups" to "service_role";

grant update on table "public"."newsletter_signups" to "service_role";

create policy "Allow admins to manage announcements"
on "public"."announcements"
as permissive
for all
to public
using (is_admin());


create policy "Allow anonymous users to view announcements"
on "public"."announcements"
as permissive
for select
to public
using (true);


create policy "Allow admins to delete connections"
on "public"."discord_connections"
as permissive
for delete
to authenticated
using ((( SELECT count(*) AS count
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::user_role))) > 0));


create policy "Allow authenticated users to insert their own connections"
on "public"."discord_connections"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Allow authenticated users to update their own connections"
on "public"."discord_connections"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can read their own Discord connections"
on "public"."discord_connections"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can view own Discord guilds"
on "public"."discord_guilds"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can view own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "Users can create their own tickets"
on "public"."support_tickets"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own tickets"
on "public"."support_tickets"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own tickets"
on "public"."support_tickets"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can add attachments to their tickets"
on "public"."ticket_attachments"
as permissive
for insert
to public
with check ((( SELECT support_tickets.user_id
   FROM support_tickets
  WHERE (support_tickets.id = ticket_attachments.ticket_id)) = auth.uid()));


create policy "Users can view attachments for their tickets"
on "public"."ticket_attachments"
as permissive
for select
to authenticated
using ((( SELECT st.user_id
   FROM support_tickets st
  WHERE (st.id = ticket_attachments.ticket_id)) = auth.uid()));


create policy "Users can add messages to their tickets"
on "public"."ticket_messages"
as permissive
for insert
to public
with check ((( SELECT support_tickets.user_id
   FROM support_tickets
  WHERE (support_tickets.id = ticket_messages.ticket_id)) = auth.uid()));


create policy "Users can view messages for their tickets"
on "public"."ticket_messages"
as permissive
for select
to public
using ((( SELECT support_tickets.user_id
   FROM support_tickets
  WHERE (support_tickets.id = ticket_messages.ticket_id)) = auth.uid()));


create policy "Admins can insert roles"
on "public"."user_roles"
as permissive
for insert
to public
with check (is_admin());


create policy "Admins can update roles"
on "public"."user_roles"
as permissive
for update
to public
using (is_admin())
with check (is_admin());


create policy "Admins can view all roles"
on "public"."user_roles"
as permissive
for select
to public
using (is_admin());


create policy "Control role deletion"
on "public"."user_roles"
as permissive
for delete
to public
using (((auth.uid() = user_id) OR is_admin()));


create policy "Users can view own roles"
on "public"."user_roles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can manage own YouTube connections"
on "public"."youtube_connections"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "Users can view own YouTube connections"
on "public"."youtube_connections"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can view own YouTube memberships"
on "public"."youtube_memberships"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM youtube_connections yc
  WHERE ((yc.user_id = auth.uid()) AND (yc.youtube_channel_id = youtube_memberships.youtube_connection_id)))));


create policy "Admins can view all discord connections"
on "public"."discord_connections"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::user_role)))));


create policy "Admins can view all discord guilds"
on "public"."discord_guilds"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::user_role)))));


create policy "Allow admin write access"
on "public"."menu_items"
as permissive
for all
to public
using (has_role(auth.uid(), 'admin'::user_role))
with check (has_role(auth.uid(), 'admin'::user_role));


CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


