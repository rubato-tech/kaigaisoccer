/**
 * AdBanner.tsx
 *
 * Google AdSense 広告スロットコンポーネント。
 *
 * 使い方:
 *   1. Google AdSense 審査通過後、client/index.html に AdSense スクリプトを追加する。
 *   2. 環境変数 VITE_ADSENSE_CLIENT と VITE_ADSENSE_SLOT_XXX を設定する。
 *   3. このコンポーネントを配置したい箇所に <AdBanner slot="horizontal" /> と記述する。
 *
 * 審査前はプレースホルダーを表示する（本番環境では非表示）。
 */

import { useEffect, useRef } from "react";

// AdSense クライアント ID（例: ca-pub-XXXXXXXXXXXXXXXXX）
// VITE_ADSENSE_CLIENT 環境変数が未設定の場合は広告を表示しない
const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT ?? "";

// スロット設定
const SLOT_IDS: Record<AdSlot, string> = {
  // 横長バナー（ページ上部・下部）
  horizontal: import.meta.env.VITE_ADSENSE_SLOT_HORIZONTAL ?? "",
  // レクタングル（記事内・サイドバー）
  rectangle: import.meta.env.VITE_ADSENSE_SLOT_RECTANGLE ?? "",
  // インフィード（試合一覧の間）
  infeed: import.meta.env.VITE_ADSENSE_SLOT_INFEED ?? "",
};

export type AdSlot = "horizontal" | "rectangle" | "infeed";

interface AdBannerProps {
  slot: AdSlot;
  className?: string;
}

/**
 * 広告が有効かどうか（クライアントIDとスロットIDが両方設定されている場合のみ有効）
 */
function isAdEnabled(slot: AdSlot): boolean {
  return Boolean(ADSENSE_CLIENT) && Boolean(SLOT_IDS[slot]);
}

/**
 * AdSense 広告スロット
 */
export function AdBanner({ slot, className = "" }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAdEnabled(slot) || initialized.current) return;
    initialized.current = true;

    try {
      // AdSense の push 呼び出し
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.warn("[AdBanner] adsbygoogle push failed:", e);
    }
  }, [slot]);

  // 広告が有効な場合: AdSense タグを表示
  if (isAdEnabled(slot)) {
    return (
      <div className={`ad-banner overflow-hidden text-center ${className}`}>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={SLOT_IDS[slot]}
          data-ad-format={slot === "horizontal" ? "auto" : "rectangle"}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // 開発環境のみプレースホルダーを表示（本番環境では非表示）
  if (import.meta.env.DEV) {
    const sizes: Record<AdSlot, string> = {
      horizontal: "h-16 md:h-24",
      rectangle: "h-48 md:h-64",
      infeed: "h-20",
    };
    const labels: Record<AdSlot, string> = {
      horizontal: "広告スロット（横長バナー） — AdSense 審査通過後に表示",
      rectangle: "広告スロット（レクタングル） — AdSense 審査通過後に表示",
      infeed: "広告スロット（インフィード） — AdSense 審査通過後に表示",
    };
    return (
      <div
        className={`flex items-center justify-center rounded border border-dashed border-muted-foreground/30 bg-muted/30 text-xs text-muted-foreground/60 ${sizes[slot]} ${className}`}
      >
        {labels[slot]}
      </div>
    );
  }

  // 本番環境でクライアントIDが未設定の場合は何も表示しない
  return null;
}
