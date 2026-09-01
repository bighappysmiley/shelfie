import { Outlet } from "react-router-dom";

/** Full-height Community shell — immersive on mobile, inset on desktop. */
export function CommunityLayout() {
  return (
    <div className="community-layout-host flex h-dvh min-h-0 flex-col overflow-hidden md:-mx-5 md:h-[calc(100dvh-3.25rem-env(safe-area-inset-bottom,0px)-2.5rem)] lg:-mx-8 lg:h-[calc(100dvh-3.5rem)]">
      <Outlet />
    </div>
  );
}
