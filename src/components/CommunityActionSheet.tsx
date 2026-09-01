import { createPortal } from "react-dom";

export type ActionSheetItem = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

export function CommunityActionSheet({
  open,
  onClose,
  title,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionSheetItem[];
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]" onClick={onClose}>
      <div
        className="community-discord-shell w-full max-w-md overflow-hidden rounded-2xl bg-[var(--community-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <p className="border-b border-[var(--community-border)] px-4 py-3 text-center text-[0.8125rem] text-muted">
            {title}
          </p>
        )}
        <div className="divide-y divide-[var(--community-border)]">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className={`block w-full px-4 py-3.5 text-[1rem] ${
                action.destructive ? "text-destructive" : "text-foreground"
              } hover:bg-[var(--community-hover)]`}
            >
              {action.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-2xl bg-[var(--community-panel)] px-4 py-3.5 text-[1rem] font-semibold text-foreground ring-1 ring-[var(--community-border)] hover:bg-[var(--community-hover)]"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
