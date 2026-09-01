import { Outlet } from "react-router-dom";

/** Full-height Community shell — escapes App Container padding and fixes nested scroll. */
export function CommunityLayout() {
  return (
    <div className="community-layout-host -mx-4 flex h-[calc(100dvh-3.25rem-env(safe-area-inset-bottom,0px)-2rem)] min-h-0 flex-col overflow-hidden sm:-mx-5 sm:h-[calc(100dvh-3.25rem-env(safe-area-inset-bottom,0px)-2.5rem)] lg:-mx-8 lg:h-[calc(100dvh-3.5rem)]">
      <Outlet />
    </div>
  );
}
