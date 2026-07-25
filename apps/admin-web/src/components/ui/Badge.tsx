type Tone = "draft" | "pending" | "published" | "warn" | "muted";

const CLASS: Record<Tone, string> = {
  draft: "badge badge-draft",
  pending: "badge badge-pending",
  published: "badge badge-published",
  warn: "badge badge-warn",
  muted: "badge",
};

export function Badge({ tone, children }: { tone: Tone; children: string }) {
  return <span className={CLASS[tone]}>{children}</span>;
}

export function RevisionBadges({
  published,
  hasUnpublishedChanges,
  isDirty,
}: {
  published: boolean;
  hasUnpublishedChanges: boolean;
  isDirty: boolean;
}) {
  return (
    <span className="badge-row">
      {published ? <Badge tone="published">公開中</Badge> : <Badge tone="draft">未公開</Badge>}
      {hasUnpublishedChanges || isDirty ? <Badge tone="warn">下書きあり</Badge> : null}
    </span>
  );
}
