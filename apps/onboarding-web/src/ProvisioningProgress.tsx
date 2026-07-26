import { useEffect, useMemo, useState } from "react";

type Step = { id: string; label: string };

const WAITING_HINTS = [
  "バックグラウンドで作業を続けています。このページは開いたままで大丈夫です。",
  "通常は 3〜5 分、混雑時でも最大 15 分ほどです。",
  "通信が混み合っているときは、少し時間がかかる場合があります。",
  "進捗が長時間更新されない場合は、自動的にエラー表示へ切り替わります。",
];

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} 秒`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min} 分 ${rem} 秒` : `${min} 分`;
}

function resolveStepIndex(stepId: string, steps: Step[]): number {
  const aliases: Record<string, string> = {
    queued: "connect",
    build: "assets",
    deploy: "deploy-public",
    verify: "finalize",
  };
  const resolved = aliases[stepId] ?? stepId;
  const i = steps.findIndex((s) => s.id === resolved);
  if (i >= 0) return i;
  if (stepId === "succeeded") return steps.length - 1;
  return 0;
}

type Props = {
  steps: Step[];
  stepId: string;
  message: string;
  accountName?: string;
  phase: "connecting" | "provisioning";
  startedAt: number;
};

export function ProvisioningProgress({ steps, stepId, message, accountName, phase, startedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const rotate = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % WAITING_HINTS.length);
    }, 8000);
    return () => window.clearInterval(rotate);
  }, []);

  const activeIndex = resolveStepIndex(stepId, steps);
  const progressPct = useMemo(() => {
    if (stepId === "succeeded") return 100;
    const lastIndex = Math.max(1, steps.length - 1);
    return Math.max(4, Math.round((activeIndex / lastIndex) * 100));
  }, [activeIndex, stepId, steps.length]);

  const headline =
    phase === "connecting"
      ? "Cloudflare との接続を確認しています…"
      : message || "サイトを開設しています…";

  return (
    <div className="provision-panel" role="status" aria-live="polite" aria-busy="true">
      <div className="provision-panel__hero">
        <div className="provision-spinner" aria-hidden="true" />
        <div className="provision-panel__titles">
          <p className="provision-panel__headline">{headline}</p>
          <p className="provision-panel__sub">
            経過時間 <strong>{formatElapsed(now - startedAt)}</strong>
            <span className="provision-panel__dot" aria-hidden="true" />
            完了までこの画面のままお待ちください
          </p>
        </div>
      </div>

      <div className="provision-bar" aria-hidden="true">
        <div className="provision-bar__track">
          <div className="provision-bar__fill" style={{ width: `${progressPct}%` }} />
          <div className="provision-bar__shimmer" />
        </div>
      </div>

      <p className="provision-hint">{WAITING_HINTS[hintIndex]}</p>

      <ol className="provision-steps">
        {steps.map((s, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <li key={s.id} className={`provision-steps__item provision-steps__item--${state}`}>
              <span className="provision-steps__icon" aria-hidden="true">
                {state === "done" ? "✓" : state === "active" ? "◉" : "○"}
              </span>
              <span className="provision-steps__label">{s.label}</span>
              {state === "active" && <span className="provision-steps__pulse" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {accountName && <p className="provision-account">アカウント: {accountName}</p>}
    </div>
  );
}
