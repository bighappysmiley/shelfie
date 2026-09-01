import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ButtonLink } from "@/components/Button";
import { CommunityDrawer } from "@/components/CommunityDrawer";
import { CommunityAvatar, NitroBadge } from "@/components/community/CommunityAvatar";
import { AuthedImage } from "@/components/AuthedImage";
import { getCommunityProfile, getCommunityProfileByUsername, communityProfileLabel } from "@/lib/community-profile";
import type { CommunityProfile } from "@/lib/community-types";

export function CommunityProfileModal({
  open,
  onClose,
  userId,
  username,
  isSelf,
}: {
  open: boolean;
  onClose: () => void;
  userId?: string | null;
  username?: string | null;
  isSelf?: boolean;
}) {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    const load = async () => {
      try {
        let p: CommunityProfile | null = null;
        if (userId) {
          p = await getCommunityProfile(userId);
        } else if (username) {
          p = await getCommunityProfileByUsername(username);
        }
        if (!cancelled) setProfile(p);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, userId, username]);

  const label = profile ? communityProfileLabel(profile) : "Member";
  const handle = profile?.communityUsername ? `@${profile.communityUsername}` : null;

  return (
    <CommunityDrawer open={open} onClose={onClose} side="right" title="Profile" width="min(22rem,92vw)">
      <div className="px-4 pb-6">
        {loading && <p className="text-[0.875rem] text-muted">Loading…</p>}
        {error && <p className="text-[0.875rem] text-destructive">{error}</p>}
        {!loading && profile && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[var(--radius-group)] border border-[var(--community-border)]">
              {profile.bannerUrl ? (
                <AuthedImage src={profile.bannerUrl} alt="" className="h-20 w-full object-cover" />
              ) : (
                <div className="h-20 bg-gradient-to-br from-accent/30 to-accent/5" />
              )}
              <div className="relative px-4 pb-4">
                <div className="-mt-8">
                  <CommunityAvatar profile={profile} size="lg" previewRing={profile.nitroEnabled} />
                </div>
                <h2 className="mt-2 flex flex-wrap items-center gap-2 text-[1.125rem] font-semibold">
                  {label}
                  {profile.nitroEnabled && <NitroBadge />}
                </h2>
                {handle && <p className="text-[0.8125rem] text-muted">{handle}</p>}
                {(profile.statusEmoji || profile.statusText) && (
                  <p className="mt-2 text-[0.875rem]">
                    {profile.statusEmoji && <span className="mr-1">{profile.statusEmoji}</span>}
                    {profile.statusText}
                  </p>
                )}
              </div>
            </div>

            {profile.bio && (
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">About</p>
                <p className="mt-1 whitespace-pre-wrap text-[0.875rem]">{profile.bio}</p>
              </div>
            )}

            {(profile.currentReadingTitle || profile.booksReadCount > 0) && (
              <div className="rounded-[var(--radius-group)] bg-fill/50 px-3 py-3">
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">Reading</p>
                {profile.currentReadingTitle && (
                  <p className="mt-1 text-[0.875rem]">
                    Currently reading <span className="font-medium">{profile.currentReadingTitle}</span>
                    {profile.currentReadingAuthor ? ` by ${profile.currentReadingAuthor}` : ""}
                  </p>
                )}
                {profile.booksReadCount > 0 && (
                  <p className="mt-1 text-[0.8125rem] text-muted">
                    {profile.booksReadCount} book{profile.booksReadCount === 1 ? "" : "s"} read
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {profile.communityUsername && (
                  <Link
                    to={`/community/u/${profile.communityUsername}`}
                    onClick={onClose}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-[var(--radius-pill)] bg-fill px-4 text-[0.9375rem] font-medium text-foreground hover:bg-fill-secondary"
                  >
                    View full profile
                  </Link>
              )}
              {isSelf && (
                <ButtonLink to="/account" size="sm" variant="secondary">
                  Edit profile
                </ButtonLink>
              )}
            </div>
          </div>
        )}
        {!loading && !profile && !error && <p className="text-[0.875rem] text-muted">Profile not found.</p>}
      </div>
    </CommunityDrawer>
  );
}
