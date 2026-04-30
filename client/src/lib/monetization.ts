/**
 * アフィリエイト・広告収益化の設定管理
 * 環境変数 VITE_AFFILIATE_* が設定されている枠のみ表示する
 */

export interface MonetizationOffer {
  key: string;
  title: string;
  description: string;
  ctaLabel: string;
  href?: string;
  badge: string;
}

function readEnv(name: string): string | undefined {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * 有効なアフィリエイトオファー一覧を返す
 * VITE_AFFILIATE_*_URL が設定されているものだけ返す
 */
export function getActiveOffers(): MonetizationOffer[] {
  const offers: MonetizationOffer[] = [
    {
      key: "streaming",
      title: "試合を観るなら",
      description:
        "DAZN・スカパー等の配信サービスで欧州サッカーをライブ視聴。ビッグマッチ前に登録がおすすめ。",
      ctaLabel: "視聴サービスを見る",
      href: readEnv("VITE_AFFILIATE_STREAMING_URL"),
      badge: "高CV",
    },
    {
      key: "merch",
      title: "応援グッズ・ユニフォーム",
      description:
        "お気に入りクラブのユニフォーム・グッズ・サッカー関連書籍などを購入できます。",
      ctaLabel: "グッズを見る",
      href: readEnv("VITE_AFFILIATE_MERCH_URL"),
      badge: "物販",
    },
    {
      key: "travel",
      title: "海外観戦旅行",
      description:
        "現地でサッカー観戦！航空券・ホテル・観戦ツアーなど高単価案件を紹介します。",
      ctaLabel: "観戦旅行の準備を見る",
      href: readEnv("VITE_AFFILIATE_TRAVEL_URL"),
      badge: "高単価",
    },
    {
      key: "membership",
      title: "おすすめ特典・サービス",
      description:
        "サッカーファン向けのサブスク・会員サービス・比較メディアなど継続報酬型案件。",
      ctaLabel: "おすすめ特典を見る",
      href: readEnv("VITE_AFFILIATE_MEMBERSHIP_URL"),
      badge: "継続報酬",
    },
  ];

  return offers.filter((offer) => offer.href);
}

/** AdSense 設定を返す */
export function getAdSenseConfig() {
  return {
    client: readEnv("VITE_ADSENSE_CLIENT"),
    topSlot: readEnv("VITE_ADSENSE_SLOT_TOP"),
    inlineSlot: readEnv("VITE_ADSENSE_SLOT_INLINE"),
  };
}
