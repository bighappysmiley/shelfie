import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LibraryProvider } from "@/lib/library";
import { PageLoading } from "@/components/LoadingTree";

export function RequireAuth() {
  const { user, loading, pending2fa } = useAuth();

  if (loading) {
    return <PageLoading />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (pending2fa) return <Navigate to="/verify-2fa" replace />;

  return (
    <LibraryProvider>
      <Outlet />
    </LibraryProvider>
  );
}
