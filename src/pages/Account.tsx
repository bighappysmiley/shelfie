import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { TextField } from "@/components/form";
import { useAuth } from "@/lib/auth";
import type { PreferredAuth } from "@/lib/library-types";

export function AccountPage() {
  const { user, signOut, userProfile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [require2fa, setRequire2fa] = useState(false);
  const [preferredAuth, setPreferredAuth] = useState<PreferredAuth>("email");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName ?? "");
      setProfilePhone(userProfile.phone ?? "");
      setRequire2fa(userProfile.require2fa);
      setPreferredAuth(userProfile.preferredAuth);
    }
  }, [userProfile]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg("");
    try {
      await updateProfile({
        displayName: displayName.trim() || null,
        phone: profilePhone.trim() || null,
        require2fa,
        preferredAuth,
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

  return (
    <div>
      <PageHeader title="Account" subtitle="Profile and sign-in security" />

      <div className="space-y-6">
        <section>
          <GroupHeader>Profile</GroupHeader>
          <Group>
            <TextField
              label="Your Name"
              grouped
              required
              hint="Shown to teammates in shared libraries"
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

        <Group>
          <PlainButton onClick={handleSignOut} disabled={signingOut} destructive>
            {signingOut ? "Signing Out…" : "Sign Out"}
          </PlainButton>
        </Group>
      </div>
    </div>
  );
}
