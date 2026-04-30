/**
 * Google AdSense 広告ブロック
 * VITE_ADSENSE_CLIENT と slot が設定されている場合のみ表示する
 * 未設定の場合は何も表示しない（プレースホルダーなし）
 */
import { useEffect, useMemo } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface Props {
  slot?: string;
  className?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
}

function ensureAdSenseScript(client: string) {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-adsbygoogle-client="${client}"]`
  );
  if (existing) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.crossOrigin = "anonymous";
  script.dataset.adsbygoogleClient = client;
  document.head.appendChild(script);
}

export function AdSenseBlock({ slot, className, format = "auto" }: Props) {
  const client =
    typeof import.meta.env.VITE_ADSENSE_CLIENT === "string"
      ? import.meta.env.VITE_ADSENSE_CLIENT
      : "";
  const enabled = Boolean(client && slot);

  // key を変えることで DOM を再生成してAdSenseに再認識させる
  const adKey = useMemo(
    () => `${slot ?? "empty"}-${Math.random().toString(36).slice(2)}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slot]
  );

  useEffect(() => {
    if (!enabled || !slot) return;
    ensureAdSenseScript(client);
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // ローカル・プレビュー環境では無視
    }
  }, [client, enabled, slot]);

  if (!enabled || !slot) return null;

  return (
    <div className={className}>
      <ins
        key={adKey}
        className="adsbygoogle block min-h-[120px] w-full overflow-hidden rounded-xl border border-border/60 bg-card/70"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
