import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { resolvePublicSiteOrigin } from "../lib/localDevUrls";
import { buildPublicLiveUrl } from "../lib/public-view";

export function usePublicHomeUrl(): string | null {
  const { session } = useAuth();
  if (!session?.siteId) return null;
  return buildPublicLiveUrl(resolvePublicSiteOrigin(session), "/home", session.siteId);
}

export function PublicSiteLink({
  className = "",
  children = "公開サイト",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const href = usePublicHomeUrl();
  if (!href) return null;
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
