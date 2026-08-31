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

export const APP_URL = "https://shelfielibrary.netlify.app";

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
  staffProfile: StaffMember | null;
  userProfile: UserProfile | null;
  pending2fa: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  verifySecondFactor: (token: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signUpWithPhone: (phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: {
    displayName?: string | null;
    phone?: string | null;
    require2fa?: boolean;
    preferredAuth?: PreferredAuth;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadStaffProfile(email: string): Promise<StaffMember | null> {
  const { data } = await supabase
    .from("staff")
    .select("email, display_name, title, role")
    .ilike("email", email)
    .maybeSingle();
  return (data as StaffMember | null) ?? null;
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, phone, require_2fa, preferred_auth")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    userId: data.user_id,
    displayName: data.display_name,
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
      return;
    }

    if (next.email) {
      const profile = await loadStaffProfile(next.email);
      setStaffProfile(profile);
    } else {
      setStaffProfile(null);
    }

    const up = await fetchUserProfile(next.id);
    setUserProfile(up);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await applyUser(data.session?.user ?? null);
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
      if (patch.phone !== undefined) row.phone = patch.phone ? normalizePhone(patch.phone) : null;
      if (patch.require2fa !== undefined) row.require_2fa = patch.require2fa;
      if (patch.preferredAuth !== undefined) row.preferred_auth = patch.preferredAuth;

      const { error } = await supabase.from("user_profiles").upsert(row);
      if (error) throw error;

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
          options: { shouldCreateUser: false },
        });
        if (error) throw error;
      }

      setPending2fa(true);
      setSecondFactor({ target, contact });
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
    },
    [secondFactor],
  );

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${APP_URL}/library`,
      },
    });
    if (error) throw error;

    if (data.session) return { needsConfirmation: false };

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError) return { needsConfirmation: false };

    return { needsConfirmation: true };
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
  }, []);

  const isStaff = Boolean(staffProfile);
  const isAdmin = staffProfile?.role === "admin";

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      accessToken: session?.access_token ?? null,
      isStaff,
      isAdmin,
      staffProfile,
      userProfile,
      pending2fa,
      signIn,
      signInWithPhone,
      verifyPhoneOtp,
      verifyEmailOtp,
      verifySecondFactor,
      signUp,
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
      staffProfile,
      userProfile,
      pending2fa,
      signIn,
      signInWithPhone,
      verifyPhoneOtp,
      verifyEmailOtp,
      verifySecondFactor,
      signUp,
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
