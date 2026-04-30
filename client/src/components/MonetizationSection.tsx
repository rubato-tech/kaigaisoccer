/**
 * アフィリエイト収益化セクション
 * VITE_AFFILIATE_*_URL が設定されている枠のみ表示する
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActiveOffers } from "@/lib/monetization";
import { Gift, ShieldCheck, ShoppingBag, Tv } from "lucide-react";

const OFFER_ICONS = {
  streaming: Tv,
  merch: ShoppingBag,
  travel: ShieldCheck,
  membership: Gift,
} as const;

export function MonetizationSection() {
  const offers = getActiveOffers();
  if (offers.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold text-primary">観戦前に役立つおすすめ</h2>
          <p className="text-sm text-muted-foreground">
            試合前の行動と相性が良いサービスを紹介しています。
            <span className="ml-1 text-[11px] opacity-70">（広告・アフィリエイトリンクを含む場合があります）</span>
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">PR</Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {offers.map((offer) => {
          const Icon = OFFER_ICONS[offer.key as keyof typeof OFFER_ICONS] ?? Gift;
          return (
            <div
              key={offer.key}
              className="rounded-xl border border-border/60 bg-background/70 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{offer.title}</span>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {offer.badge}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{offer.description}</p>
              <Button asChild className="mt-4 w-full" variant="outline" size="sm">
                <a href={offer.href} target="_blank" rel="sponsored noreferrer">
                  {offer.ctaLabel}
                </a>
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
