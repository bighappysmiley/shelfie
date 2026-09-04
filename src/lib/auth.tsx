import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { StaffMember } from "./support-types";
import type { PreferredAuth, UserProfile } from "./library-types";
import { normalizePhone } from "./library-storage";
import {
  isValidCommunityUsername,
  normalizeCommunityUsername,
} from "./community-identity";

export const APP_URL = "https://shelfielibrary.netlify.app";

/** Prefer the current origin so local/preview confirmation links work. */
export function getAppUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const fromEnv = import.meta.env.VITE_APP_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim().replace(/\/$/, "");
  return APP_URL;
}

export function authCallbackUrl(): string {
  return `${getAppUrl()}/auth/callback`;
}

/** Platform owner — always treated as staff/admin even if the staff query fails. */
export const PLATFORM_OWNER_EMAIL = "hillelfrankel0@icloud.com";

const OWNER_STAFF_FALLBACK: StaffMember = {
  email: PLATFORM_OWNER_EMAIL,
  display_name: "Hillel Frankel",
  title: "Owner",
  role: "admin",
};

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed || null;
}

function ownerFallback(email: string | null | undefined): StaffMember | null {
  return normalizeEmail(email) === PLATFORM_OWNER_EMAIL ? { ...OWNER_STAFF_FALLBACK } : null;
}

type SignInResult = {
  needsSecondFactor: boolean;
  secondFactorTarget?: "email" | "phone";
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  isStaff: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  staffProfile: StaffMember | null;
  userProfile: UserProfile | null;
  pending2fa: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  verifySecondFactor: (token: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  signUpWithPhone: (phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: {
    displayName?: string | null;
    communityUsername?: string | null;
    communityDisplayName?: string | null;
    phone?: string | null;
    require2fa?: boolean;
    preferredAuth?: PreferredAuth;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadStaffProfile(email: string | null | undefined): Promise<StaffMember | null> {
  const normalized = normalizeEmail(email);

  const { data: rpcRows, error: rpcError } = await supabase.rpc("get_my_staff_profile");
  if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
    const row = rpcRows[0] as StaffMember;
    return {
      email: row.email,
      display_name: row.display_name,
      title: row.title,
      role: row.role === "admin" ? "admin" : "staff",
    };
  }

  if (normalized) {
    const { data } = await supabase
      .from("staff")
      .select("email, display_name, title, role")
      .ilike("email", normalized)
      .maybeSingle();
    if (data) {
      const row = data as StaffMember;
      return {
        email: row.email,
        display_name: row.display_name,
        title: row.title,
        role: row.role === "admin" ? "admin" : "staff",
      };
    }
  }

  return ownerFallback(normalized);
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select(
      "user_id, display_name, community_username, community_display_name, phone, require_2fa, preferred_auth",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    userId: data.user_id,
    displayName: data.display_name,
    communityUsername: (data.community_username as string | null) ?? null,
    communityDisplayName: (data.community_display_name as string | null) ?? null,
    phone: data.phone,
    require2fa: data.require_2fa,
    preferredAuth: data.preferred_auth as PreferredAuth,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState<StaffMember | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pending2fa, setPending2fa] = useState(false);
  const [secondFactor, setSecondFactor] = useState<{
    target: "email" | "phone";
    contact: string;
  } | null>(null);

  const applyUser = useCallback(async (next: User | null) => {
    if (!next) {
      setStaffProfile(null);
      setUserProfile(null);
      setPending2fa(false);
      setSecondFactor(null);
      try {
        sessionStorage.removeItem("pine-pending-2fa");
      } catch {
        /* ignore */
      }
      return;
    }

    const profile = await loadStaffProfile(next.email);
    setStaffProfile(profile);

    const up = await fetchUserProfile(next.id);
    setUserProfile(up);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await applyUser(data.session?.user ?? null);
      if (data.session?.user) {
        try {
          const raw = sessionStorage.getItem("pine-pending-2fa");
          if (raw) {
            const parsed = JSON.parse(raw) as {
              target?: "email" | "phone";
              contact?: string;
              at?: number;
            };
            const fresh = typeof parsed.at === "number" && Date.now() - parsed.at < 15 * 60 * 1000;
            if (fresh && parsed.target && parsed.contact) {
              setPending2fa(true);
              setSecondFactor({ target: parsed.target, contact: parsed.contact });
            } else {
              sessionStorage.removeItem("pine-pending-2fa");
            }
          }
        } catch {
          /* ignore */
        }
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      await applyUser(next?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applyUser]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const up = await fetchUserProfile(data.user.id);
      setUserProfile(up);
    }
  }, []);

  const updateProfile = useCallback(
    async (patch: {
      displayName?: string | null;
      communityUsername?: string | null;
      communityDisplayName?: string | null;
      phone?: string | null;
      require2fa?: boolean;
      preferredAuth?: PreferredAuth;
    }) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Not signed in");

      const row: Record<string, unknown> = {
        user_id: data.user.id,
        updated_at: new Date().toISOString(),
      };
      if (patch.displayName !== undefined) {
        row.display_name = patch.displayName?.trim() || null;
      }
      if (patch.communityUsername !== undefined) {
        const raw = patch.communityUsername?.trim() || null;
        if (raw) {
          const username = normalizeCommunityUsername(raw);
          if (!isValidCommunityUsername(username)) {
            throw new Error(
              "Username must be 3–24 characters: letters, numbers, and underscores only.",
            );
          }
          row.community_username = username;
        } else {
          row.community_username = null;
        }
      }
      if (patch.communityDisplayName !== undefined) {
        row.community_display_name = patch.communityDisplayName?.trim() || null;
      }
      if (patch.phone !== undefined) row.phone = patch.phone ? normalizePhone(patch.phone) : null;
      if (patch.require2fa !== undefined) row.require_2fa = patch.require2fa;
      if (patch.preferredAuth !== undefined) row.preferred_auth = patch.preferredAuth;

      const { error } = await supabase.from("user_profiles").upsert(row);
      if (error) {
        if (error.code === "23505" || /unique|duplicate/i.test(error.message)) {
          throw new Error("That @username is already taken. Try another.");
        }
        throw error;
      }

      if (patch.phone && patch.phone !== data.user.phone) {
        const { error: phoneErr } = await supabase.auth.updateUser({
          phone: normalizePhone(patch.phone),
        });
        if (phoneErr) throw phoneErr;
      }

      // Optimistic local update so setup → home doesn't bounce on a stale profile.
      setUserProfile((prev) => ({
        userId: data.user!.id,
        displayName:
          patch.displayName !== undefined
            ? patch.displayName?.trim() || null
            : prev?.displayName ?? null,
        communityUsername:
          patch.communityUsername !== undefined
            ? patch.communityUsername
              ? patch.communityUsername.trim().replace(/^@+/, "").toLowerCase()
              : null
            : prev?.communityUsername ?? null,
        communityDisplayName:
          patch.communityDisplayName !== undefined
            ? patch.communityDisplayName?.trim() || null
            : prev?.communityDisplayName ?? null,
        phone:
          patch.phone !== undefined
            ? patch.phone
              ? normalizePhone(patch.phone)
              : null
            : prev?.phone ?? null,
        require2fa: patch.require2fa ?? prev?.require2fa ?? false,
        preferredAuth: patch.preferredAuth ?? prev?.preferredAuth ?? "email",
      }));

      await refreshProfile();
    },
    [refreshProfile],
  );

  const maybeRequireSecondFactor = useCallback(
    async (user: User, profile: UserProfile | null): Promise<SignInResult> => {
      if (!profile?.require2fa) {
        setPending2fa(false);
        setSecondFactor(null);
        return { needsSecondFactor: false };
      }

      const usePhone = Boolean(profile.phone && user.email);
      const contact = usePhone ? profile.phone! : user.email!;
      const target = usePhone ? "phone" : "email";

      if (target === "phone") {
        const { error } = await supabase.auth.signInWithOtp({ phone: contact });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: contact,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: authCallbackUrl(),
          },
        });
        if (error) throw error;
      }

      setPending2fa(true);
      setSecondFactor({ target, contact });
      try {
        sessionStorage.setItem(
          "pine-pending-2fa",
          JSON.stringify({ target, contact, at: Date.now() }),
        );
      } catch {
        /* ignore */
      }
      return { needsSecondFactor: true, secondFactorTarget: target };
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await fetchUserProfile(data.user!.id);
      setUserProfile(profile);
      return maybeRequireSecondFactor(data.user!, profile);
    },
    [maybeRequireSecondFactor],
  );

  const signInWithPhone = useCallback(async (phone: string) => {
    const normalized = normalizePhone(phone);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    if (error) throw error;
  }, []);

  const verifyPhoneOtp = useCallback(async (phone: string, token: string) => {
    const normalized = normalizePhone(phone);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token,
      type: "sms",
    });
    if (error) throw error;
    if (data.user) {
      const profile = await fetchUserProfile(data.user.id);
      setUserProfile(profile);
      await maybeRequireSecondFactor(data.user, profile);
    }
  }, [maybeRequireSecondFactor]);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    if (error) throw error;
    if (data.user) {
      const profile = await fetchUserProfile(data.user.id);
      setUserProfile(profile);
    }
    setPending2fa(false);
    setSecondFactor(null);
  }, []);

  const verifySecondFactor = useCallback(
    async (token: string) => {
      if (!secondFactor) throw new Error("No verification in progress");

      if (secondFactor.target === "phone") {
        const { error } = await supabase.auth.verifyOtp({
          phone: secondFactor.contact,
          token,
          type: "sms",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.verifyOtp({
          email: secondFactor.contact,
          token,
          type: "email",
        });
        if (error) throw error;
      }

      setPending2fa(false);
      setSecondFactor(null);
      try {
        sessionStorage.removeItem("pine-pending-2fa");
      } catch {
        /* ignore */
      }
    },
    [secondFactor],
  );

  const signUp = useCallback(async (email: string, password: string) => {
    const normalized = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: {
        emailRedirectTo: authCallbackUrl(),
      },
    });
    if (error) throw error;

    // Supabase returns a user with empty identities when the email is already registered.
    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      throw new Error(
        "An account with this email already exists. Sign in instead, or use Forgot password if you need to reset it.",
      );
    }

    if (data.session) return { needsConfirmation: false };

    // Confirm-email enabled: no session until the user clicks the link.
    // Do not pretend a confirmation email was sent when password sign-in fails for other reasons.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });
    if (!signInError) return { needsConfirmation: false };

    const msg = (signInError.message || "").toLowerCase();
    if (
      msg.includes("email not confirmed") ||
      msg.includes("not confirmed") ||
      signInError.code === "email_not_confirmed"
    ) {
      return { needsConfirmation: true };
    }

    // No session after signup usually means confirmation is required.
    if (!data.session && data.user) return { needsConfirmation: true };

    throw signInError;
  }, []);

  const resendSignupConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: authCallbackUrl() },
    });
    if (error) throw error;
  }, []);

  const signUpWithPhone = useCallback(async (phone: string) => {
    const normalized = normalizePhone(phone);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setStaffProfile(null);
    setUserProfile(null);
    setPending2fa(false);
    setSecondFactor(null);
    try {
      sessionStorage.removeItem("pine-pending-2fa");
    } catch {
      /* ignore */
    }
  }, []);

  const sessionEmail = normalizeEmail(session?.user?.email);
  const staffEmail = normalizeEmail(staffProfile?.email);
  const isPlatformOwnerEmail =
    sessionEmail === PLATFORM_OWNER_EMAIL || staffEmail === PLATFORM_OWNER_EMAIL;
  const isStaff = Boolean(staffProfile) || isPlatformOwnerEmail;
  const isAdmin = staffProfile?.role === "admin" || isPlatformOwnerEmail;
  const isOwner =
    isPlatformOwnerEmail ||
    (isAdmin && staffProfile?.title?.toLowerCase() === "owner");

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      accessToken: session?.access_token ?? null,
      isStaff,
      isAdmin,
      isOwner,
      staffProfile,
      userProfile,
      pending2fa,
      signIn,
      signInWithPhone,
      verifyPhoneOtp,
      verifyEmailOtp,
      verifySecondFactor,
      signUp,
      resendSignupConfirmation,
      signUpWithPhone,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [
      session,
      loading,
      isStaff,
      isAdmin,
      isOwner,
      staffProfile,
      userProfile,
      pending2fa,
      signIn,
      signInWithPhone,
      verifyPhoneOtp,
      verifyEmailOtp,
      verifySecondFactor,
      signUp,
      resendSignupConfirmation,
      signUpWithPhone,
      signOut,
      refreshProfile,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
