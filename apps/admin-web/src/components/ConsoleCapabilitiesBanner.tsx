import { useConsoleCapabilities } from "../hooks/useConsoleCapabilities";

export function ConsoleCapabilitiesBanner() {
  const { capabilities } = useConsoleCapabilities();
  if (!capabilities) return null;

  if (!(capabilities.instantLogin && capabilities.environment === "preview")) {
    return null;
  }

  return (
    <div className="console-capabilities-banners" role="status" aria-live="polite">
      <div className="console-capabilities-banner">
        <strong>お試しログイン構成</strong>
        <p>
          「管理をはじめる」はデモ用 instant login です。本番運用では Passkey と BASER_ENV=production を設定してください。
        </p>
      </div>
    </div>
  );
}
