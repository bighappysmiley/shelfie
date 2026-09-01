import { CommunityDrawer } from "@/components/CommunityDrawer";
import { MemberListPanel } from "@/components/community/MemberListPanel";
import type { CommunityProfile, CommunityServerMember } from "@/lib/community-types";

export function CommunityMemberDrawer({
  open,
  onClose,
  members,
  memberProfiles,
  serverBoosters,
  appOwnerUserIds = new Set<string>(),
  onOpenProfile,
}: {
  open: boolean;
  onClose: () => void;
  members: CommunityServerMember[];
  memberProfiles?: Map<string, CommunityProfile>;
  serverBoosters?: Set<string>;
  appOwnerUserIds?: Set<string>;
  onOpenProfile?: (target: { userId?: string; username?: string | null }) => void;
}) {
  return (
    <CommunityDrawer
      open={open}
      onClose={onClose}
      side="right"
      title={`Members — ${members.length}`}
      width="min(16rem,80vw)"
    >
      <MemberListPanel
        members={members}
        memberProfiles={memberProfiles}
        serverBoosters={serverBoosters}
        appOwnerUserIds={appOwnerUserIds}
        showSearch
        onOpenProfile={(target) => {
          onOpenProfile?.(target);
          onClose();
        }}
      />
    </CommunityDrawer>
  );
}
