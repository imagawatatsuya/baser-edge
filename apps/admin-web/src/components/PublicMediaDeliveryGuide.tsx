import { useConsoleCapabilities } from "../hooks/useConsoleCapabilities";

const R2_GET_STARTED = "https://developers.cloudflare.com/r2/get-started/";

export function PublicMediaDeliveryGuide({ className = "" }: { className?: string }) {
  const { capabilities, reload } = useConsoleCapabilities();
  if (!capabilities || capabilities.assetPublicDelivery) return null;

  return (
    <aside
      className={`public-media-guide${className ? ` ${className}` : ""}`}
      aria-labelledby="public-media-guide-title"
    >
      <h2 id="public-media-guide-title" className="public-media-guide-title">
        公開サイトで画像を見せる（任意）
      </h2>
      <p className="public-media-guide-lead">
        この画面での<strong>アップロードと一覧はそのまま使えます</strong>。訪問者向けの URL（
        <code>/assets/…</code>）だけ、Cloudflare 側の追加設定が必要です。テキスト中心のお試しなら、このまま進めて問題ありません。
      </p>
      <ol className="public-media-guide-steps">
        <li>
          <a href={R2_GET_STARTED} target="_blank" rel="noopener noreferrer">
            Cloudflare で R2 を有効化
          </a>
          （無料枠内の利用が多いです。Workers の有料プランとは別手続きです）
        </li>
        <li>
          お試し開始時と同じ <strong>Deploy to Cloudflare</strong> をもう一度実行する（GitHub Pages の
          <code> /start/</code>、または Cloudflare ダッシュボードの Workers Builds から再デプロイでも可）
        </li>
        <li>
          画像を<strong>再アップロード</strong>する（R2 追加前に上げたファイルは公開用の実体がありません）
        </li>
      </ol>
      <p className="public-media-guide-actions">
        <button type="button" className="btn-text" onClick={() => reload()}>
          配信設定を再確認
        </button>
        <span className="public-media-guide-actions-hint">再デプロイ後に押すと、バナーが消えることがあります。</span>
      </p>
      <details className="public-media-guide-dev">
        <summary>開発者向け（CLI）</summary>
        <p>
          <code>npm run enable-media:cloudflare</code> または <code>prove:cloudflare</code> の再実行でも同様です。詳細はリポジトリの{" "}
          <code>docs/deployment/cloudflare-r2-and-media.md</code>
        </p>
      </details>
    </aside>
  );
}
