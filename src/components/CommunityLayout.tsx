import { Outlet } from "react-router-dom";

/**
 * Full-height Community shell.
 * Parent `main` already owns the viewport height — do not use negative
 * margins (those clipped the layout on iPad when Container padding was removed).
 */
export function CommunityLayout() {
  return (
    <div className="community-layout-host flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <Outlet />
    </div>
  );
}
