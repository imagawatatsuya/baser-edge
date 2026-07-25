import { useConsoleCapabilities } from "../hooks/useConsoleCapabilities";

export function ConsoleCapabilitiesBanner() {
  const { capabilities } = useConsoleCapabilities();
  if (!capabilities) return null;

  const warnings: { title: string; body: string }[] = [];

  if (!capabilities.assetPublicDelivery) {
    warnings.push({
      title: "公開メディア配信は無効です",
      body:
        "このデプロイでは API Worker に R2 バインディングがありません。メディアのアップロードと一覧はできますが、公開サイトの /assets/… では画像・ファイルは表示されません。Cloudflare で R2 を有効化したうえで enable-media:cloudflare（または R2 込みの prove）を実行し、必要なら画像を再アップロードしてください。",
    });
  }

  if (capabilities.instantLogin && capabilities.environment === "preview") {
    warnings.push({
      title: "お試しログイン構成",
      body: "「管理をはじめる」はデモ用 instant login です。本番運用では Passkey と BASER_ENV=production を設定してください。",
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="console-capabilities-banners" role="status" aria-live="polite">
      {warnings.map((w) => (
        <div key={w.title} className="console-capabilities-banner">
          <strong>{w.title}</strong>
          <p>{w.body}</p>
        </div>
      ))}
    </div>
  );
}
