# アーキテクチャ比較・移行方針ガイド

> **対象**: kaigaisoccer.com の本番運用・収益最大化を目指す方向け  
> **作成日**: 2026-05-01

---

## 1. 両システムの構成比較

### 1-A. Manusシステム（現在稼働中）

| 要素 | 内容 |
|------|------|
| フロントエンド | React 19 + Vite + Tailwind 4 + shadcn/ui |
| バックエンド | Express 4 + tRPC 11 |
| DB | MySQL / TiDB（Drizzle ORM） |
| 定期更新 | Manusスケジュールタスク（毎週火曜5:00 JST） |
| 認証 | Manus OAuth（ログイン機能あり） |
| お気に入り | DB保存（ログイン時） + localStorage（未ログイン時） |
| iCalフィード | `/api/ical/:token`（HMAC署名付きトークン） |
| Googleカレンダー | 個別試合追加ボタン（gcal URL方式） |
| 広告 | AdSenseプレースホルダー実装済み |
| 収益化ブロック | なし（未実装） |
| ホスティング | Manus（kaigai-soccer.manus.space） |

### 1-B. 他AIシステム（Cloudflare構成）

| 要素 | 内容 |
|------|------|
| フロントエンド | React 19 + Vite + Tailwind 4 + shadcn/ui |
| バックエンド | Cloudflare Worker（KV読み書き専用） |
| DB | Cloudflare KV（JSONスナップショット） |
| 定期更新 | Worker Cron（`15 */3 * * *` = 3時間ごと） |
| 認証 | なし（localStorage のみ） |
| お気に入り | localStorage のみ（DB保存なし） |
| iCalフィード | なし |
| Googleカレンダー | Google Identity Services API直接呼び出し（OAuth PKCE） |
| 広告 | AdSense + アフィリエイト4枠（MonetizationSection） |
| 収益化ブロック | `MonetizationSection`（DAZN・グッズ・旅行・会員） |
| ホスティング | Cloudflare Pages（静的） + Worker |

---

## 2. 各システムの強み・弱み

### Manusシステムの強み

- **ユーザー認証・DB保存**: お気に入りチームをアカウントに紐付けて保存できる。デバイスをまたいでも設定が引き継がれる。
- **iCalフィード**: HMAC署名付きトークンで保護された `.ics` フィードを提供。Googleカレンダーへの「購読」（自動更新）が可能。
- **Manus上で即座に公開可能**: 現在すでに `kaigai-soccer.manus.space` で稼働中。
- **カップ戦・日本人選手タブ**: 5大リーグ＋UEFA3大会＋各国カップ戦5大会＋日本人所属4リーグを網羅。

### Manusシステムの弱み

- **運用コスト**: Manus以外の外部サーバー（Railway等）では月額費用が発生する。
- **収益化ブロックが未完成**: MonetizationSection（DAZN・グッズ等のアフィリエイト枠）が未実装。
- **Googleカレンダー連携が簡易版**: gcal URLを開くだけで、Google Calendar API直接書き込みは未実装。

### 他AIシステムの強み

- **完全無料運用**: Cloudflare Pages（静的ホスティング）+ Worker（3時間ごとCron）で月額0円。
- **高速・高可用性**: Cloudflare CDNのエッジ配信により世界中で高速表示。SEOに有利。
- **収益化ブロック完成度が高い**: `MonetizationSection` + `lib/monetization.ts` で4種類のアフィリエイト枠を環境変数で管理。
- **Google Calendar API直接連携**: `useGoogleCalendar` + `googleIdentity` で OAuth PKCE フローを実装。試合を直接カレンダーに書き込める。
- **WeeklyPlanner**: 「観戦予定リスト」機能で今週見る試合を一括管理・一括カレンダー追加できる。
- **フォールバック設計**: Worker APIが落ちていても静的JSONにフォールバックするため、サービス停止しない。

### 他AIシステムの弱み

- **認証なし**: お気に入りはlocalstorage保存のみ。デバイスをまたいで同期できない。
- **iCalフィードなし**: カレンダーへの「購読」（自動更新）機能がない。
- **カップ戦が少ない**: Manusシステムより対応リーグ数が少ない（FAカップ・コッパ・イタリア・クープ・ド・フランス等が未収録）。

---

## 3. 推奨方針：「Manusで育てて、Cloudflareに移行」

### 結論

**短期（今すぐ）**: Manusシステムをそのまま使い、不足している機能（MonetizationSection・WeeklyPlanner・Google Calendar API連携）を他AIのコードから移植する。

**中期（収益が安定したら）**: Cloudflare Pages + Worker構成に移行し、運用コストをゼロに近づける。

この方針が最も合理的な理由は以下のとおりです。

1. **Manusシステムはすでに稼働中**であり、データベースに試合データが蓄積されている。今すぐ移行する必要はない。
2. **他AIシステムの優れたUI部品**（WeeklyPlanner・MonetizationSection・useGoogleCalendar）はフロントエンドコンポーネントであり、バックエンドに依存しないため、Manusシステムに移植しやすい。
3. **Cloudflare移行は設計変更を伴う**ため、収益化の目処が立ってから計画的に行う方が安全。

---

## 4. 今すぐ実施すべき移植作業（Manusシステムへの取り込み）

### 優先度 高

| 移植元（他AIシステム） | 移植先（Manusシステム） | 効果 |
|----------------------|----------------------|------|
| `MonetizationSection.tsx` | `client/src/components/` に追加 | DAZN・グッズ等のアフィリエイト収益化 |
| `lib/monetization.ts` | `client/src/lib/` に追加 | 環境変数でアフィリエイトURLを管理 |
| `WeeklyPlanner.tsx` | `client/src/components/` に追加 | 観戦予定リスト・一括カレンダー追加 |
| `useGoogleCalendar.ts` | `client/src/hooks/` に追加 | Google Calendar API直接書き込み |
| `lib/googleIdentity.ts` | `client/src/lib/` に追加 | Google OAuth PKCE フロー |
| `lib/googleCalendarDirect.ts` | `client/src/lib/` に追加 | Calendar API呼び出し |

### 優先度 中

| 作業 | 内容 |
|------|------|
| `VITE_ADSENSE_CLIENT` 等の環境変数設定 | AdSense審査通過後に設定 |
| `VITE_AFFILIATE_STREAMING_URL` 等の設定 | DAZN・楽天等のアフィリエイトURL |
| `VITE_GOOGLE_CLIENT_ID` の設定 | Google Calendar API用クライアントID |

---

## 5. Cloudflare移行手順（中期）

Cloudflare移行は以下の手順で実施します。他AIの `wrangler.worker.toml` と `worker/src/index.ts` がそのまま使えます。

### Step 1: Cloudflareアカウントの準備

```powershell
# Wrangler CLIをインストール
npm install -g wrangler

# ログイン
wrangler login
```

### Step 2: KV Namespaceの作成

```powershell
# KV Namespaceを作成
wrangler kv:namespace create "MATCHES_KV"
# → 出力された id を wrangler.worker.toml の id に設定

wrangler kv:namespace create "MATCHES_KV" --preview
# → 出力された id を wrangler.worker.toml の preview_id に設定
```

### Step 3: wrangler.worker.tomlの更新

```toml
[[kv_namespaces]]
binding = "MATCHES_KV"
id = "実際のKV Namespace ID"
preview_id = "プレビュー用KV Namespace ID"
```

### Step 4: Workerのデプロイ

```powershell
# ZIPを展開したディレクトリで実行
cd kaigaisoccer-cloudflare-autosync

# 依存関係をインストール
pnpm install

# Workerをデプロイ
wrangler deploy --config wrangler.worker.toml

# 初回データ同期（手動トリガー）
curl -X POST https://kaigaisoccer-matches-api.{your-subdomain}.workers.dev/v1/admin/sync
```

### Step 5: Cloudflare Pagesのデプロイ

```powershell
# .env.productionを作成
echo "VITE_MATCHES_API_BASE_URL=https://kaigaisoccer-matches-api.{your-subdomain}.workers.dev" > .env.production

# ビルド
pnpm build

# Pagesにデプロイ
wrangler pages deploy dist --project-name kaigaisoccer
```

### Step 6: カスタムドメインの設定

Cloudflare Dashboard → Pages → kaigaisoccer → Custom domains → `kaigaisoccer.com` を追加。

---

## 6. 収益最大化ロードマップ

### フェーズ1（今すぐ）: アフィリエイト収益化

| 施策 | 期待収益 | 難易度 |
|------|---------|--------|
| DAZN アフィリエイト（A8.net） | 1件1,500〜2,000円 | 低 |
| 楽天 Kobo（サッカー本） | 1件50〜200円 | 低 |
| HIS 海外旅行（観戦旅行） | 1件3,000〜10,000円 | 中 |
| DMM FX（高単価案件） | 1件10,000〜20,000円 | 高 |

環境変数に設定するだけで `MonetizationSection` に自動表示されます。

```
VITE_AFFILIATE_STREAMING_URL=https://px.a8.net/svt/ejp?a8mat=...（DAZN）
VITE_AFFILIATE_MERCH_URL=https://hb.afl.rakuten.co.jp/...（楽天）
VITE_AFFILIATE_TRAVEL_URL=https://...（HIS）
VITE_AFFILIATE_MEMBERSHIP_URL=https://...（DMM FX等）
```

### フェーズ2（AdSense審査通過後）: ディスプレイ広告

AdSense審査の主要要件：
- **独自ドメイン必須**（kaigaisoccer.com ✅ 取得済み）
- **プライバシーポリシーページ必須**（/privacy ✅ 実装済み）
- **お問い合わせページ必須**（/contact ✅ 実装済み）
- **コンテンツの独自性**: 日本語での試合解説・チーム紹介記事を追加すると審査通過率が上がる
- **月間PV目安**: 明確な基準はないが、1,000PV/月以上が目安

審査通過後に設定する環境変数：
```
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT_TOP=XXXXXXXXXX
VITE_ADSENSE_SLOT_INLINE=XXXXXXXXXX
```

### フェーズ3（月間10万PV超）: 直接広告・スポンサー

- サッカー関連企業への直接営業（スポーツ用品店・スポーツバー等）
- note/Substack でのプレミアムコンテンツ販売

---

## 7. SEO対策チェックリスト

| 項目 | 状態 | 対応方法 |
|------|------|---------|
| 独自ドメイン | ✅ kaigaisoccer.com 取得済み | — |
| HTTPS | ✅ | — |
| プライバシーポリシー | ✅ /privacy 実装済み | — |
| お問い合わせ | ✅ /contact 実装済み | — |
| サイトマップ | ❌ 未実装 | `/sitemap.xml` を追加 |
| OGP/Twitter Card | ❌ 未実装 | `index.html` に meta タグを追加 |
| 構造化データ | ❌ 未実装 | JSON-LD（SportsEvent スキーマ）を追加 |
| ページ速度 | 要確認 | Cloudflare移行で大幅改善 |

---

## 8. まとめ

他AIが指摘した「Cloudflare Workers + KV/D1 への移行」は正しい方向性です。ただし、**今すぐ全面移行する必要はありません**。

現在のManusシステムは認証・DB・iCalフィードという他AIシステムにない機能を持っており、これらは収益化（ユーザーリテンション）に貢献します。

**推奨アクション（優先順）**:

1. 他AIの `MonetizationSection` + `WeeklyPlanner` + `useGoogleCalendar` をManusシステムに移植する（今すぐ）
2. DAZN等のアフィリエイトURLを環境変数に設定して収益化を開始する（今すぐ）
3. kaigaisoccer.com をManusの公開URLにカスタムドメイン設定する（今すぐ）
4. AdSense審査を申請する（kaigaisoccer.com 公開後）
5. 月間PVが安定したらCloudflare移行を検討する（中期）
