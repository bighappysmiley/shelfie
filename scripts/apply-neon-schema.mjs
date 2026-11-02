#!/usr/bin/env node
/**
 * Apply Neon bootstrap + adapted Supabase migrations via psql.
 * Strips Supabase Realtime publication lines and remaps auth.users → neon_auth."user".
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const root = "/workspace";
const outDir = join(root, "neon", "migrations", "_compiled");
mkdirSync(outDir, { recursive: true });

const NEON_ASSERT_VERIFICATION = `
CREATE OR REPLACE FUNCTION public._assert_verification_for_join(
  p_verification_level text,
  p_via_invite boolean DEFAULT false,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, neon_auth
AS $neon_assert$
DECLARE
  v_email_verified boolean;
  v_created_at timestamptz;
BEGIN
  IF coalesce(p_verification_level, 'none') = 'none' THEN
    RETURN;
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT u."emailVerified", u."createdAt"
    INTO v_email_verified, v_created_at
  FROM neon_auth."user" u
  WHERE u.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF p_verification_level = 'high' AND NOT p_via_invite THEN
    RAISE EXCEPTION 'This server requires an invite to join.';
  END IF;
  IF p_verification_level IN ('low', 'medium', 'high') THEN
    IF coalesce(v_email_verified, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Verify your email before joining this server.';
    END IF;
  END IF;
  IF p_verification_level IN ('medium', 'high') THEN
    IF coalesce(v_created_at, now()) > now() - interval '5 minutes' THEN
      RAISE EXCEPTION 'Your account must be at least 5 minutes old to join this server.';
    END IF;
  END IF;
END;
$neon_assert$;
`;

function adaptSql(sql) {
  let out = sql;
  out = out.replace(
    /DO\s+\$\$\s*BEGIN\s*ALTER PUBLICATION supabase_realtime[\s\S]*?END\s*\$\$\s*;/gim,
    "-- skipped: supabase_realtime DO block\n",
  );
  out = out.replace(
    /^\s*ALTER PUBLICATION supabase_realtime[\s\S]*?;\s*$/gim,
    "-- skipped: supabase_realtime publication\n",
  );
  // Replace Supabase-shaped verification helper before generic auth.users rewrites
  out = out.replace(
    /CREATE OR REPLACE FUNCTION public\._assert_verification_for_join\([\s\S]*?\$\$\s*;/m,
    NEON_ASSERT_VERIFICATION.trim() + "\n",
  );
  out = out.replace(/auth\.users%ROWTYPE/gi, 'neon_auth."user"%ROWTYPE');
  out = out.replace(/REFERENCES\s+auth\.users\s*\(\s*id\s*\)/gi, 'REFERENCES neon_auth."user"(id)');
  out = out.replace(/references\s+auth\.users\s*\(\s*id\s*\)/g, 'references neon_auth."user"(id)');
  out = out.replace(/\bFROM\s+auth\.users\b/gi, 'FROM neon_auth."user"');
  out = out.replace(/\bJOIN\s+auth\.users\b/gi, 'JOIN neon_auth."user"');
  out = out.replace(/\bUPDATE\s+auth\.users\b/gi, 'UPDATE neon_auth."user"');
  out = out.replace(/\bINTO\s+auth\.users\b/gi, 'INTO neon_auth."user"');
  out = out.replace(/\bauth\.users\b/gi, 'neon_auth."user"');
  // Neon Data API roles
  out = out.replace(/\bTO\s+anon\b/g, "TO anonymous");
  out = out.replace(/\bTO\s+service_role\b/g, "TO authenticated");
  out = out.replace(/\banon,\s*/g, "anonymous, ");
  out = out.replace(/,\s*service_role\b/g, "");
  out = out.replace(/\bservice_role,\s*/g, "");
  return out;
}

/** Explicit dependency order — filename sort is not chronological for same-day deps. */
const ORDERED = [
  "000_bootstrap.sql",
  "20260831_team_libraries.sql",
  "20260831_ensure_default_library_rpc.sql",
  "20260831_fix_library_rls_recursion.sql",
  "20260831_user_display_name.sql",
  "20260831_user_profiles_write_policies.sql",
  "20260901_community_groups.sql",
  "20260901_community_discord.sql",
  "20260901_community_library_servers.sql",
  "20260901_community_identity.sql",
  "20260901_community_invites.sql",
  "20260901_community_role_permissions.sql",
  "20260901_community_server_settings_extended.sql", // defines can_manage_community_server
  "20260901_community_join_requests.sql",
  "20260901_community_message_edits_welcome.sql",
  "20260901_community_multi_servers.sql",
  "20260901_community_pinned_messages.sql",
  "20260901_community_profiles_and_assets.sql",
  "20260901_community_reactions_replies.sql",
  "20260901_community_read_state.sql",
  "20260901_channel_slow_mode.sql",
  "20260901_discord_channel_kinds.sql",
  "20260901_nitro_boosts.sql",
  "20260901_remove_default_categories.sql",
  "20260901_app_owner_ids.sql",
];

const files = [];
const seen = new Set();

function add(name, path) {
  if (seen.has(name)) return;
  if (!existsSync(path)) {
    console.warn(`skip missing ${name}`);
    return;
  }
  files.push({ name, path });
  seen.add(name);
}

add("000_bootstrap.sql", join(root, "neon/migrations/000_bootstrap.sql"));
const migDir = join(root, "supabase/migrations");
for (const name of ORDERED) {
  if (name === "000_bootstrap.sql") continue;
  add(name, join(migDir, name));
}
for (const name of readdirSync(migDir).sort()) {
  if (!name.endsWith(".sql")) continue;
  add(name, join(migDir, name));
}
add("999_neon_compat.sql", join(root, "neon/migrations/999_neon_compat.sql"));

const combinedPath = join(outDir, "all.sql");
writeFileSync(
  combinedPath,
  files.map((f) => `\n-- ===== ${f.name} =====\n${adaptSql(readFileSync(f.path, "utf8"))}\n`).join("\n"),
);
console.log(`Wrote ${combinedPath} (${files.length} files)`);
console.log("Order head:", files.slice(0, 10).map((f) => f.name).join(" → "));

const result = spawnSync("psql", [DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-f", combinedPath], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  console.error(`psql exited with ${result.status}`);
  process.exit(result.status || 1);
}

console.log("Schema apply complete.");
