import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PageHeader,
  Group,
  GroupHeader,
  GroupFooter,
  ListRow,
  ToggleRow,
  PlainButton,
  SegmentedControl,
} from "@/components/layout";
import { Button } from "@/components/Button";
import { TextField, TextArea } from "@/components/form";
import { AuthedImage } from "@/components/AuthedImage";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { useAuth } from "@/lib/auth";
import type { PreferredAuth } from "@/lib/library-types";
import {
  getCommunityProfile,
  updateCommunityProfile,
  uploadCommunityProfileImage,
} from "@/lib/community-profile";
import { PRO_PERKS, PROFILE_RINGS, type ProfileRingId } from "@/lib/pro";

export function AccountPage() {
  const { user, signOut, userProfile, updateProfile, isStaff, isOwner } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [communityUsername, setCommunityUsername] = useState("");
  const [communityDisplayName, setCommunityDisplayName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [require2fa, setRequire2fa] = useState(false);
  const [preferredAuth, setPreferredAuth] = useState<PreferredAuth>("email");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [statusEmoji, setStatusEmoji] = useState("");
  const [statusText, setStatusText] = useState("");
  const [booksReadCount, setBooksReadCount] = useState(0);
  const [currentReadingTitle, setCurrentReadingTitle] = useState("");
  const [currentReadingAuthor, setCurrentReadingAuthor] = useState("");
  const [proEnabled, setProEnabled] = useState(false);
  const [profileRing, setProfileRing] = useState<ProfileRingId | "">("pro");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName ?? "");
      setCommunityUsername(userProfile.communityUsername ?? "");
      setCommunityDisplayName(userProfile.communityDisplayName ?? "");
      setProfilePhone(userProfile.phone ?? "");
      setRequire2fa(userProfile.require2fa);
      setPreferredAuth(userProfile.preferredAuth);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!user) return;
    void getCommunityProfile(user.id)
      .then((p) => {
        if (!p) return;
        setBio(p.bio ?? "");
        setAvatarUrl(p.avatarUrl);
        setBannerUrl(p.bannerUrl);
        setStatusEmoji(p.statusEmoji ?? "");
        setStatusText(p.statusText ?? "");
        setBooksReadCount(p.booksReadCount);
        setCurrentReadingTitle(p.currentReadingTitle ?? "");
        setCurrentReadingAuthor(p.currentReadingAuthor ?? "");
        setProEnabled(Boolean(p.proEnabled ?? p.nitroEnabled));
        setProfileRing((p.profileRing === "nitro" ? "pro" : (p.profileRing as ProfileRingId)) || "pro");
      })
      .catch(() => {});
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg("");
    try {
      await updateProfile({
        displayName: displayName.trim() || null,
        communityUsername: communityUsername.trim() || null,
        communityDisplayName: communityDisplayName.trim() || null,
        phone: profilePhone.trim() || null,
        require2fa,
        preferredAuth,
      });
      await updateCommunityProfile(user.id, {
        bio: bio.trim() || null,
        avatarUrl,
        bannerUrl,
        statusEmoji: statusEmoji.trim() || null,
        statusText: statusText.trim() || null,
        booksReadCount,
        currentReadingTitle: currentReadingTitle.trim() || null,
        currentReadingAuthor: currentReadingAuthor.trim() || null,
        proEnabled,
        profileRing: proEnabled ? profileRing || "pro" : null,
      });
      setProfileMsg("Settings saved");
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const uploadImage = async (file: File, kind: "avatar" | "banner") => {
    const setBusy = kind === "avatar" ? setUploadingAvatar : setUploadingBanner;
    setBusy(true);
    setProfileMsg("");
    try {
      const url = await uploadCommunityProfileImage(file);
      if (kind === "avatar") setAvatarUrl(url);
      else setBannerUrl(url);
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const previewProfile = {
    communityDisplayName: communityDisplayName || displayName,
    displayName,
    communityUsername,
    avatarUrl,
    proEnabled,
    nitroEnabled: proEnabled,
    profileRing: proEnabled ? profileRing || "pro" : null,
  };

  return (
    <div>
      <PageHeader title="Account" subtitle="Profile and sign-in security" />

      <div className="space-y-6">
        <section>
          <GroupHeader>Community profile</GroupHeader>
          <Group>
            <div className="overflow-hidden">
              {bannerUrl ? (
                <AuthedImage src={bannerUrl} alt="" className="h-24 w-full object-cover" />
              ) : (
                <div className="h-24 bg-gradient-to-br from-accent/25 to-accent/5" />
              )}
              <div className="flex items-end gap-3 px-4 pb-4 pt-0">
                <div className="-mt-8">
                  <CommunityAvatar
                    profile={previewProfile}
                    size="lg"
                    className="ring-4 ring-surface"
                    previewRing={proEnabled}
                  />
                </div>
                <div className="flex flex-1 flex-wrap gap-2 pb-1">
                  <input
                    ref={avatarInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadImage(f, "avatar");
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={bannerInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadImage(f, "banner");
                      e.target.value = "";
                    }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={uploadingAvatar}
                    onClick={() => avatarInput.current?.click()}
                  >
                    {uploadingAvatar ? "Uploading…" : "Avatar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={uploadingBanner}
                    onClick={() => bannerInput.current?.click()}
                  >
                    {uploadingBanner ? "Uploading…" : "Banner"}
                  </Button>
                </div>
              </div>
            </div>
            <TextField
              label="Community display name"
              grouped
              hint="How you appear in chats — separate from your library/team name"
              placeholder="e.g. Alex"
              value={communityDisplayName}
              onChange={(e) => setCommunityDisplayName(e.target.value)}
            />
            <TextField
              label="@username"
              grouped
              hint="Unique handle (3–24 chars: letters, numbers, _)"
              placeholder="alex_reads"
              value={communityUsername}
              onChange={(e) => setCommunityUsername(e.target.value.replace(/\s/g, ""))}
            />
            <TextArea
              label="Bio"
              grouped
              hint="Shown on your community profile"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <TextField
              label="Status emoji"
              grouped
              placeholder="📚"
              value={statusEmoji}
              onChange={(e) => setStatusEmoji(e.target.value)}
            />
            <TextField
              label="Status text"
              grouped
              placeholder="Reading with the club"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
            />
          </Group>
          <GroupFooter>
            Your community profile is visible to members on servers you share. The reading habit app
            will sync books read and current book here.
          </GroupFooter>
        </section>

        <section>
          <GroupHeader>Plans &amp; Pro</GroupHeader>
          <Group>
            <ToggleRow
              label="Enable Pine Pro (test)"
              hint="Local test toggle for profile perks. Billing plans live on Pricing."
              checked={proEnabled}
              onChange={setProEnabled}
            />
            <Link
              to="/pricing"
              className="flex min-h-[44px] items-center justify-between px-4 py-3 hairline-b last:border-b-0 text-[1.0625rem] active:bg-fill-secondary"
            >
              <span>View plans &amp; upgrade</span>
              <span className="text-muted">→</span>
            </Link>
            {proEnabled && (
              <div className="space-y-3 px-4 py-3 hairline-b">
                <p className="text-[0.8125rem] font-medium text-muted">Animated profile ring</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PROFILE_RINGS.map((ring) => (
                    <button
                      key={ring.id}
                      type="button"
                      onClick={() => setProfileRing(ring.id)}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                        profileRing === ring.id
                          ? "border-accent bg-accent/10"
                          : "border-black/10 hover:bg-fill dark:border-white/10"
                      }`}
                    >
                      <CommunityAvatar
                        profile={{
                          ...previewProfile,
                          profileRing: ring.id,
                          proEnabled: true,
                          nitroEnabled: true,
                        }}
                        size="md"
                        previewRing
                      />
                      <span className="text-[0.75rem] font-medium">{ring.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="px-4 py-3">
              <p className="text-[0.8125rem] font-medium text-muted">Pro perks (test)</p>
              <ul className="mt-2 space-y-1">
                {PRO_PERKS.map((perk) => (
                  <li key={perk} className="text-[0.875rem] text-foreground">
                    <span className="text-accent">✦</span> {perk}
                  </li>
                ))}
              </ul>
            </div>
          </Group>
          <GroupFooter>
            Boost a server to unlock perks for everyone at Level 2+, including holographic roles.
          </GroupFooter>
        </section>

        <section>
          <GroupHeader>Reading (preview)</GroupHeader>
          <Group>
            <TextField
              label="Books read"
              type="number"
              min={0}
              grouped
              value={String(booksReadCount)}
              onChange={(e) => setBooksReadCount(Math.max(0, Number(e.target.value) || 0))}
            />
            <TextField
              label="Currently reading"
              grouped
              placeholder="Book title"
              value={currentReadingTitle}
              onChange={(e) => setCurrentReadingTitle(e.target.value)}
            />
            <TextField
              label="Author"
              grouped
              placeholder="Author name"
              value={currentReadingAuthor}
              onChange={(e) => setCurrentReadingAuthor(e.target.value)}
            />
          </Group>
        </section>

        <section>
          <GroupHeader>Library team</GroupHeader>
          <Group>
            <TextField
              label="Your Name"
              grouped
              required
              hint="Shown to teammates in shared libraries (not your Community handle)"
              placeholder="e.g. Alex Morgan"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <ListRow title="Email" trailing={user?.email ?? "—"} />
            <ListRow title="Phone" trailing={userProfile?.phone ?? user?.phone ?? "Not set"} />
          </Group>
        </section>

        <section>
          <GroupHeader>Sign-In & Security</GroupHeader>
          <Group>
            <div className="px-4 py-3 hairline-b">
              <SegmentedControl
                value={preferredAuth}
                onChange={(v) => setPreferredAuth(v as PreferredAuth)}
                options={[
                  { value: "email", label: "Email" },
                  { value: "phone", label: "Phone" },
                  { value: "both", label: "Both" },
                ]}
              />
            </div>
            <TextField
              label="Phone Number"
              type="tel"
              grouped
              hint="Used for phone sign-in and as a second factor"
              placeholder="+1 555 0100"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
            />
            <ToggleRow
              label="Two-Factor Authentication"
              hint="Require a code after password sign-in"
              checked={require2fa}
              onChange={setRequire2fa}
            />
            <div className="px-4 py-3">
              {profileMsg && (
                <p
                  className={`mb-2 text-[0.9375rem] ${
                    profileMsg.includes("saved") ? "text-success" : "text-destructive"
                  }`}
                >
                  {profileMsg}
                </p>
              )}
              <Button className="w-full" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save"}
              </Button>
            </div>
          </Group>
          <GroupFooter>
            Phone sign-in sends a verification code by SMS when enabled in Supabase.
          </GroupFooter>
        </section>

        {isStaff && (
          <section>
            <GroupHeader>Platform</GroupHeader>
            <Group>
              <Link
                to="/admin"
                className="flex min-h-[44px] items-center justify-between px-4 py-3 hairline-b last:border-b-0 text-[1.0625rem] active:bg-fill-secondary"
              >
                <span>{isOwner ? "Admin (Owner)" : "Admin"}</span>
                <span className="text-muted">→</span>
              </Link>
            </Group>
            <GroupFooter>
              Support inbox, users, libraries, enterprise leads, and plans.
            </GroupFooter>
          </section>
        )}

        <Group>
          <PlainButton onClick={handleSignOut} disabled={signingOut} destructive>
            {signingOut ? "Signing Out…" : "Sign Out"}
          </PlainButton>
        </Group>
      </div>
    </div>
  );
}
