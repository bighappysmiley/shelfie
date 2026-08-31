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

export const APP_URL = "https://shelfielibrary.netlify.app";
export const SUPPORT_EMAIL = "hf@bighappysmiley.com";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  isStaff: boolean;
  isAdmin: boolean;
  staffProfile: StaffMember | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState<StaffMember | null>(null);

  const applyUser = useCallback(async (next: User | null) => {
    if (!next?.email) {
      setStaffProfile(null);
      return;
    }
    const profile = await loadStaffProfile(next.email);
    setStaffProfile(profile);
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

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

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

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setStaffProfile(null);
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
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, isStaff, isAdmin, staffProfile, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
