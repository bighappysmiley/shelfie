import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ButtonLink } from "@/components/Button";
import { CommunityDiscordShell, CommunityScrollBody } from "@/components/CommunityRail";
import { CommunityAvatar, ProBadge } from "@/components/community/CommunityAvatar";
import { AuthedImage } from "@/components/AuthedImage";
import { getCommunityProfileByUsername, communityProfileLabel } from "@/lib/community-profile";
import type { CommunityProfile } from "@/lib/community-types";
import { useAuth } from "@/lib/auth";

export function CommunityProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    setLoading(true);
    void getCommunityProfileByUsername(username)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const label = profile ? communityProfileLabel(profile) : username;
  const isSelf = Boolean(profile && user && profile.userId === user.id);

  return (
    <CommunityDiscordShell pane="discover" onAdd={() => {}}>
      <CommunityScrollBody className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-4">
          <Link to="/community" className="text-[0.875rem] text-link">
            ← Back to Community
          </Link>
        </div>

        {loading && <p className="text-muted">Loading profile…</p>}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && profile && (
          <div className="overflow-hidden rounded-[var(--radius-group)] border border-[var(--community-border)] bg-[var(--community-panel)]">
            {profile.bannerUrl ? (
              <AuthedImage src={profile.bannerUrl} alt="" className="h-28 w-full object-cover" />
            ) : (
              <div className="h-28 bg-gradient-to-br from-accent/35 to-accent/10" />
            )}
            <div className="px-5 pb-6">
              <div className="-mt-10">
                <CommunityAvatar profile={profile} size="xl" previewRing={profile.proEnabled ?? profile.nitroEnabled} />
              </div>
              <h1 className="mt-3 flex flex-wrap items-center gap-2 text-[1.375rem] font-bold">
                {label}
                {(profile.proEnabled ?? profile.nitroEnabled) && <ProBadge />}
              </h1>
              {profile.communityUsername && (
                <p className="text-[0.9375rem] text-muted">@{profile.communityUsername}</p>
              )}
              {(profile.statusEmoji || profile.statusText) && (
                <p className="mt-2 text-[0.9375rem]">
                  {profile.statusEmoji && <span className="mr-1.5">{profile.statusEmoji}</span>}
                  {profile.statusText}
                </p>
              )}

              {profile.bio && (
                <p className="mt-4 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{profile.bio}</p>
              )}

              <div className="mt-5 rounded-[var(--radius-group)] bg-fill/50 px-4 py-3">
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">Reading habit</p>
                {profile.currentReadingTitle ? (
                  <p className="mt-2 text-[0.9375rem]">
                    Currently reading <span className="font-semibold">{profile.currentReadingTitle}</span>
                    {profile.currentReadingAuthor ? (
                      <span className="text-muted"> by {profile.currentReadingAuthor}</span>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-2 text-[0.875rem] text-muted">No active book — synced from the reading app when linked.</p>
                )}
                <p className="mt-2 text-[0.8125rem] text-muted">
                  {profile.booksReadCount} book{profile.booksReadCount === 1 ? "" : "s"} read
                </p>
              </div>

              {isSelf && (
                <ButtonLink to="/account" className="mt-5 w-full" variant="secondary">
                  Edit your profile
                </ButtonLink>
              )}
            </div>
          </div>
        )}

        {!loading && !profile && !error && (
          <p className="text-muted">No profile found for @{username}.</p>
        )}
      </CommunityScrollBody>
    </CommunityDiscordShell>
  );
}
