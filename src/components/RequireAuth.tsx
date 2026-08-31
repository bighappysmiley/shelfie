import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LibraryProvider } from "@/lib/library";

export function RequireAuth() {
  const { user, loading, pending2fa } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-fill border-t-accent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (pending2fa) return <Navigate to="/verify-2fa" replace />;

  return (
    <LibraryProvider>
      <Outlet />
    </LibraryProvider>
  );
}
