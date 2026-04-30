import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-10">
        <Button variant="ghost" size="sm" className="mb-6 gap-1.5" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            トップに戻る
          </Link>
        </Button>

        <h1 className="font-serif text-3xl font-black text-primary mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-muted-foreground mb-8">最終更新: 2026年4月</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-serif text-xl font-bold mb-2">1. 基本方針</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              海外サッカー日程（以下「本サイト」）は、ユーザーの個人情報の保護を重要な責務と認識し、
              適切な管理・保護に努めます。
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold mb-2">2. 収集する情報</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              本サイトでは、以下の情報を収集する場合があります。
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>アクセスログ（IPアドレス、ブラウザ種別、参照元URL、アクセス日時）</li>
              <li>Cookieおよびローカルストレージに保存される設定情報（お気に入りチーム等）</li>
              <li>ログイン時のアカウント情報（Manus OAuth経由で取得）</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold mb-2">3. Cookieの利用</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              本サイトでは、利便性向上のためCookieを使用しています。また、広告配信のため
              Google AdSense等の第三者広告サービスがCookieを使用する場合があります。
              これらのCookieは、ユーザーの興味に応じた広告を表示するために使用されます。
              ブラウザの設定によりCookieを無効化することができますが、一部機能が制限される場合があります。
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold mb-2">4. Google AdSenseについて</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              本サイトはGoogle AdSenseを利用した広告を掲載しています。
              Googleはユーザーのウェブサイト訪問情報に基づいて広告を配信します。
              Googleによる広告配信の詳細および無効化については、
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline ml-1"
              >
                Google広告ポリシー
              </a>
              をご参照ください。
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold mb-2">5. アクセス解析</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              本サイトでは、サービス改善のためアクセス解析ツールを使用する場合があります。
              収集されたデータは匿名化されており、個人を特定するものではありません。
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold mb-2">6. 個人情報の第三者提供</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold mb-2">7. 免責事項</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              本サイトに掲載する試合情報は TheSportsDB のデータを利用しています。
              情報の正確性・完全性を保証するものではなく、試合日程の変更・中止等について
              本サイトは一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold mb-2">8. お問い合わせ</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              プライバシーポリシーに関するお問い合わせは、
              <Link href="/contact" className="text-primary underline ml-1">
                お問い合わせページ
              </Link>
              よりご連絡ください。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
