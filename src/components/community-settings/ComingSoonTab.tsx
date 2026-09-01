import { EmptyState } from "@/components/layout";

export function ComingSoonTab({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <EmptyState
      title={title}
      description={`${description} This section is on the roadmap for Pine Community.`}
    />
  );
}
