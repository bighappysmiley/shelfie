-- Role permission columns used by server settings (safe to re-run)

ALTER TABLE public.community_server_roles
  ADD COLUMN IF NOT EXISTS can_kick_members boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_ban_members boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_messages boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_invite_users boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hoist boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentionable boolean NOT NULL DEFAULT true;
