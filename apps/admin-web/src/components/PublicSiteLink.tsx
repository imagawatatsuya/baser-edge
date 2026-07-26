import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { resolvePublicSiteOrigin } from "../lib/localDevUrls";
import { buildPublicLiveUrl, type BuildPublicLiveUrlOptions } from "../lib/public-view";

export function usePublicHomeUrl(options: BuildPublicLiveUrlOptions = {}): string | null {
  const { session } = useAuth();
  if (!session) return null;
  return buildPublicLiveUrl(resolvePublicSiteOrigin(session), "/home", options);
}

export function PublicSiteLink({
  className = "",
  children = "公開サイト",
  showVisitorLink = false,
  visitorClassName,
  visitorLabel = "訪問者と同じ表示",
}: {
  className?: string;
  children?: ReactNode;
  showVisitorLink?: boolean;
  visitorClassName?: string;
  visitorLabel?: string;
}) {
  const operatorHref = usePublicHomeUrl({ showPublishedBanner: true });
  const visitorHref = usePublicHomeUrl({ showPublishedBanner: false });
  if (!operatorHref) return null;
  return (
    <>
      <a className={className} href={operatorHref} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
      {showVisitorLink && visitorHref ? (
        <a
          className={visitorClassName ?? className}
          href={visitorHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {visitorLabel}
        </a>
      ) : null}
    </>
  );
}
