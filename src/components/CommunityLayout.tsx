import { Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { COMMUNITY_MAINTENANCE_MODE } from "@/lib/community-maintenance";
import { CommunityBeBackSoonPage } from "@/pages/CommunityBeBackSoon";

/**
 * Full-height Community shell.
 * Parent `main` already owns the viewport height — do not use negative
 * margins (those clipped the layout on iPad when Container padding was removed).
 *
 * While maintenance mode is on, non-admins see an Apple-style “Be Back Soon”
 * screen. Admins and the platform owner keep full access.
 */
export function CommunityLayout() {
  const { isAdmin, isOwner } = useAuth();
  const canBypassMaintenance = isAdmin || isOwner;

  if (COMMUNITY_MAINTENANCE_MODE && !canBypassMaintenance) {
    return (
      <div className="community-layout-host flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <CommunityBeBackSoonPage />
      </div>
    );
  }

  return (
    <div className="community-layout-host flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <Outlet />
    </div>
  );
}
