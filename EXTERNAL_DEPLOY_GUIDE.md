# kaigaisoccer.com 外部運用・収益最大化 完全ガイド

> **方針：完全無料運用**  
> このガイドは **Cloudflare Pages + Workers + D1** を使った **月額0円** 運用を前提としています。  
> サーバー常駐・有料サービスは一切使用しません。

---

## 目次

1. [全体アーキテクチャ](#1-全体アーキテクチャ)
2. [対応リーグ・大会一覧](#2-対応リーグ大会一覧)
3. [事前準備](#3-事前準備)
4. [Cloudflare アカウント設定](#4-cloudflare-アカウント設定)
5. [D1 データベース作成](#5-d1-データベース作成)
6. [Cloudflare Worker（自動データ取得）のデプロイ](#6-cloudflare-workerデプロイ)
7. [Cloudflare Pages（フロントエンド）のデプロイ](#7-cloudflare-pagesデプロイ)
8. [kaigaisoccer.com ドメイン設定](#8-kaigaisoccercom-ドメイン設定)
9. [Google AdSense 申請手順](#9-google-adsense-申請手順)
10. [アフィリエイト収益化ロードマップ](#10-アフィリエイト収益化ロードマップ)
11. [Google Calendar API 設定](#11-google-calendar-api-設定)
12. [SEO・Google Search Console 設定](#12-seogoogle-search-console-設定)
13. [翌シーズン自動移行の仕組み](#13-翌シーズン自動移行の仕組み)
14. [Cloudflare 無料枠の上限と注意点](#14-cloudflare-無料枠の上限と注意点)
15. [環境変数一覧](#15-環境変数一覧)

---

## 1. 全体アーキテクチャ

```
kaigaisoccer.com
│
├── Cloudflare Pages（フロントエンド）
│   ├── React + Vite でビルドした静的ファイルを配信
│   ├── Cloudflare CDN でグローバル高速配信（世界300拠点）
│   └── 月額0円（無料枠：500ビルド/月、帯域無制限）
│
├── Cloudflare Workers（バックエンド API）
│   ├── /api/matches  → D1から試合データを返す
│   ├── /api/ical/:token → iCalフィード生成
│   └── 月額0円（無料枠：10万リクエスト/日）
│
├── Cloudflare D1（データベース）
│   ├── SQLite互換のサーバーレスDB
│   ├── 試合データ・お気に入りチームを保存
│   └── 月額0円（無料枠：500万行読み取り/日、10万行書き込み/日）
│
└── Cloudflare Cron Triggers（自動データ取得）
    ├── 毎週火曜 5:00 JST に TheSportsDB から試合データを取得
    ├── D1 に upsert して自動更新
    └── 月額0円（無料枠：Workers に含む）
```

**データフロー：**

1. Cron Trigger が毎週自動実行 → TheSportsDB API から試合データ取得 → D1 に保存
2. ユーザーがサイトにアクセス → Pages が静的 HTML を返す → Workers API から試合データを取得して表示
3. コード変更時のみ Pages を再デプロイ（試合データ更新は完全自動）

---

## 2. 対応リーグ・大会一覧

| カテゴリ | 大会名 |
|---------|--------|
| **欧州5大リーグ** | プレミアリーグ / ラ・リーガ / セリエA / ブンデスリーガ / リーグ・アン |
| **UEFA大会** | チャンピオンズリーグ / ヨーロッパリーグ / カンファレンスリーグ |
| **各国カップ戦** | FAカップ / コパ・デル・レイ / コッパ・イタリア / DFBポカール / クープ・ド・フランス |
| **日本人所属リーグ** | スコットランド / オランダ / ベルギー / ポルトガル / トルコ / スイス / オーストリア / デンマーク / ノルウェー / スウェーデン / ポーランド / ギリシャ / チェコ / セルビア / クロアチア / ルーマニア / フィンランド |
| **日本人所属カップ戦** | タサ・デ・ポルトガル |
| **代表戦** | 欧州・南米・アジア主要代表 |

---

## 3. 事前準備

| 項目 | 内容 | 費用 |
|------|------|------|
| Cloudflare アカウント | 無料プランで十分 | **無料** |
| GitHub アカウント | コードのホスティング | **無料** |
| Node.js 22 + pnpm | ローカルビルド環境 | **無料** |
| kaigaisoccer.com | 取得済み | 取得済み |
| Google アカウント | AdSense・Search Console 用 | **無料** |

---

## 4. Cloudflare アカウント設定

### 4-1. アカウント作成・ログイン

```
https://dash.cloudflare.com/ にアクセスして無料アカウントを作成
```

### 4-2. Wrangler CLI のインストール

PowerShell（Windows）または Terminal（Mac/Linux）で実行：

```powershell
npm install -g wrangler
wrangler login
```

ブラウザが開くので Cloudflare アカウントで認証してください。

---

## 5. D1 データベース作成

### 5-1. D1 データベースを作成

```powershell
wrangler d1 create kaigaisoccer-db
```

出力例：
```
✅ Successfully created DB 'kaigaisoccer-db'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**`database_id` をメモしておいてください。**

### 5-2. スキーマを適用

プロジェクトの `drizzle/` フォルダにある SQL ファイルを適用します：

```powershell
# プロジェクトフォルダに移動
cd kaigaisoccer

# マイグレーション SQL を D1 に適用（ファイル名は実際のものに合わせてください）
wrangler d1 execute kaigaisoccer-db --file=drizzle/0000_tearful_mandarin.sql
wrangler d1 execute kaigaisoccer-db --file=drizzle/0001_amazing_venus.sql
wrangler d1 execute kaigaisoccer-db --file=drizzle/0002_curious_brood.sql
wrangler d1 execute kaigaisoccer-db --file=drizzle/0003_chemical_jack_power.sql
```

---

## 6. Cloudflare Worker（データ取得）のデプロイ

### 6-1. wrangler.toml の設定

プロジェクトルートに `wrangler.toml` を作成：

```toml
name = "kaigaisoccer-worker"
main = "server/worker-entry.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "kaigaisoccer-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← 5-1 でメモしたID

[triggers]
crons = ["0 20 * * 1"]  # 毎週月曜 20:00 UTC = 火曜 5:00 JST

[vars]
NODE_ENV = "production"
```

### 6-2. Worker のデプロイ

```powershell
wrangler deploy
```

### 6-3. 初回データ取得の実行

デプロイ後、すぐにデータを取得するには Cloudflare Dashboard → Workers → `kaigaisoccer-worker` → **Triggers** → **Cron Triggers** → **Run** をクリックしてください。

---

## 7. Cloudflare Pages（フロントエンド）のデプロイ

### 7-1. GitHub にプッシュ

```powershell
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-username/kaigaisoccer.git
git push -u origin main
```

### 7-2. Cloudflare Pages でプロジェクト作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages**
2. **Connect to Git** → GitHub リポジトリを選択
3. ビルド設定を入力：

| 項目 | 値 |
|------|-----|
| Framework preset | Vite |
| Build command | `pnpm build` |
| Build output directory | `client/dist` |
| Root directory | `/` |

4. **Environment variables** に後述の環境変数を追加
5. **Save and Deploy** をクリック

### 7-3. Worker と Pages を接続

Pages の設定 → **Functions** → **D1 database bindings** で `kaigaisoccer-db` を追加。

---

## 8. kaigaisoccer.com ドメイン設定

### 8-1. Cloudflare にドメインを追加

1. Cloudflare Dashboard → **Add a Site** → `kaigaisoccer.com` を入力
2. **Free プラン**を選択
3. 表示されたネームサーバー（例：`alice.ns.cloudflare.com`）を、ドメイン登録会社の管理画面で設定

### 8-2. Pages にカスタムドメインを設定

1. Pages プロジェクト → **Custom domains** → **Set up a custom domain**
2. `kaigaisoccer.com` と `www.kaigaisoccer.com` の両方を追加
3. Cloudflare が自動で SSL 証明書を発行（通常5分以内に有効化）

### 8-3. HTTPS の確認

設定後 `https://kaigaisoccer.com` にアクセスして HTTPS 接続を確認してください。

---

## 9. Google AdSense 申請手順

### 9-1. 申請前の必須条件

| 条件 | 状況 |
|------|------|
| 独自ドメイン | ✅ kaigaisoccer.com 取得済み |
| プライバシーポリシーページ | ✅ /privacy 実装済み |
| お問い合わせページ | ✅ /contact 実装済み |
| HTTPS | ✅ Cloudflare が自動設定 |
| オリジナルコンテンツ | ✅ 試合日程（自動更新） |

### 9-2. 申請手順

1. [Google AdSense](https://www.google.com/adsense/) にアクセス
2. **利用を開始** → Google アカウントでログイン
3. サイト URL に `https://kaigaisoccer.com` を入力
4. 審査コードが発行されるので、`client/index.html` の `<head>` 内に貼り付け：

```html
<!-- AdSense 審査コード（審査通過後に広告コードに置き換え） -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```

5. Cloudflare Pages を再デプロイ（git push するだけで自動デプロイ）
6. AdSense 管理画面で「審査をリクエスト」
7. 審査期間：通常 1〜2 週間

### 9-3. 審査通過後の設定

環境変数に以下を追加して再デプロイ（git push するだけ）：

```
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT_TOP=XXXXXXXXXX
VITE_ADSENSE_SLOT_INLINE=XXXXXXXXXX
```

---

## 10. アフィリエイト収益化ロードマップ

### 収益源の優先順位

| 優先度 | 収益源 | 報酬単価 | 申請先 |
|--------|--------|----------|--------|
| ★★★ | DAZN（月額契約） | 1,000〜2,000円/件 | [A8.net](https://www.a8.net/) |
| ★★★ | Google AdSense | クリック単価 30〜100円 | [Google AdSense](https://www.google.com/adsense/) |
| ★★☆ | U-NEXT（動画配信） | 2,000〜3,000円/件 | [A8.net](https://www.a8.net/) / afb |
| ★★☆ | 楽天市場（サッカーグッズ） | 購入額の 1〜3% | [楽天アフィリエイト](https://affiliate.rakuten.co.jp/) |
| ★★☆ | Amazon（サッカー書籍・グッズ） | 購入額の 2〜4% | [Amazon アソシエイト](https://affiliate.amazon.co.jp/) |

### 月間収益試算

| 月間PV | AdSense | DAZN AF | 合計 |
|--------|---------|---------|------|
| 1万PV | 1,000円 | 5,000円 | **6,000円** |
| 5万PV | 5,000円 | 25,000円 | **30,000円** |
| 20万PV | 20,000円 | 100,000円 | **120,000円** |

### DAZN アフィリエイト設定手順

1. [A8.net](https://www.a8.net/) に登録（無料）
2. プログラム検索 → 「DAZN」で検索 → 提携申請
3. 承認後、バナーリンクを取得
4. 環境変数に設定：

```
VITE_AFFILIATE_DAZN_URL=https://px.a8.net/svt/ejp?a8mat=XXXXXXXX
VITE_AFFILIATE_DAZN_BANNER=https://www.a8.net/0.gif?a8mat=XXXXXXXX
```

5. git push → Cloudflare Pages が自動再デプロイ → MonetizationSection に自動表示

### 収益最大化ロードマップ

**フェーズ1（デプロイ直後）**
- Google AdSense 申請
- DAZN アフィリエイト登録・バナー設置
- Google Search Console 登録・サイトマップ送信

**フェーズ2（3ヶ月後）**
- AdSense 審査通過 → 広告スロット有効化
- U-NEXT アフィリエイト追加
- 楽天・Amazon アソシエイト追加

**フェーズ3（6ヶ月後）**
- 各リーグ・チームの紹介ページ追加（SEO コンテンツ）
- プッシュ通知（試合開始1時間前）
- メールマガジン（試合前日に配信）

---

## 11. Google Calendar API 設定

Google Calendar API を設定すると、ユーザーが「カレンダーに追加」ボタンを押したときに直接 Google カレンダーに書き込めます。未設定時は ICS ダウンロードに自動フォールバックします。

### 11-1. Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（例：`kaigaisoccer`）
3. **APIs & Services** → **Library** → **Google Calendar API** を有効化
4. **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. アプリケーションの種類：**Web application**
6. 承認済みの JavaScript 生成元に `https://kaigaisoccer.com` を追加
7. クライアント ID をコピー

### 11-2. 環境変数に設定

```
VITE_GOOGLE_CLIENT_ID=XXXXXXXXXX.apps.googleusercontent.com
```

---

## 12. SEO・Google Search Console 設定

### 12-1. Google Search Console への登録

1. [Google Search Console](https://search.google.com/search-console/) にアクセス
2. **プロパティを追加** → `https://kaigaisoccer.com`
3. **DNS レコード**での確認を選択（Cloudflare 管理なので簡単）
4. Cloudflare Dashboard → DNS → TXT レコードを追加

### 12-2. サイトマップの送信

1. Search Console → **サイトマップ** → `https://kaigaisoccer.com/sitemap.xml` を送信
2. インデックス登録をリクエスト

### 12-3. 狙うべきキーワード

```
「海外サッカー 日程」「プレミアリーグ 日程」「CL 日程」
「○○ vs △△ 何時」「○○ 試合 日本時間」
「欧州サッカー 今週」「カップ戦 日程」「日本人選手 試合 日程」
```

### 12-4. 実装済みの SEO 対策

本サイトには以下が実装済みです：

- OGP メタタグ（og:title / og:description / og:url）
- Twitter Card メタタグ
- JSON-LD 構造化データ（WebSite / SportsOrganization）
- `sitemap.xml`（`/sitemap.xml` でアクセス可能）
- `robots.txt`（`/robots.txt` でアクセス可能）
- canonical URL（`https://kaigaisoccer.com`）

---

## 13. 翌シーズン自動移行の仕組み

このシステムは **完全自動化** されています。手動作業は一切不要です。

### 自動化の仕組み

```
毎週月曜 20:00 UTC（火曜 5:00 JST）
  ↓
Cloudflare Cron Trigger が発火
  ↓
Worker が TheSportsDB API から全リーグの試合データを取得
  ↓
D1 データベースに upsert（既存データは更新、新規データは追加）
  ↓
翌日からサイトに反映
```

### シーズン移行時の動作

TheSportsDB は新シーズンのデータを自動的に追加します。Cron Trigger が毎週実行されるため、新シーズンの試合が自動的に取得・表示されます。**手動操作は一切不要です。**

---

## 14. Cloudflare 無料枠の上限と注意点

| サービス | 無料枠 | 想定使用量 | 余裕 |
|----------|--------|------------|------|
| Pages ビルド | 500回/月 | 月数回 | ✅ 十分 |
| Workers リクエスト | 10万回/日 | 〜1,000回/日 | ✅ 十分 |
| D1 読み取り | 500万行/日 | 〜10万行/日 | ✅ 十分 |
| D1 書き込み | 10万行/日 | 〜1,000行/週 | ✅ 十分 |
| D1 ストレージ | 5GB | 〜100MB | ✅ 十分 |

月間 PV が **50万を超えた場合**は Workers の有料プラン（$5/月）への移行を検討してください。それ以下であれば永続的に無料で運用できます。

---

## 15. 環境変数一覧

Cloudflare Pages の **Settings → Environment variables** に設定してください。

### 必須（システム動作に必要）

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `JWT_SECRET` | セッション署名用シークレット | 任意の32文字以上のランダム文字列 |

### 収益化（設定すると広告・アフィリエイトが有効化）

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `VITE_ADSENSE_CLIENT` | AdSense パブリッシャー ID | Google AdSense 管理画面 |
| `VITE_ADSENSE_SLOT_TOP` | ヘッダー下広告スロット ID | AdSense → 広告ユニット |
| `VITE_ADSENSE_SLOT_INLINE` | インライン広告スロット ID | AdSense → 広告ユニット |
| `VITE_AFFILIATE_DAZN_URL` | DAZN アフィリエイトリンク | A8.net → DAZN プログラム |
| `VITE_AFFILIATE_DAZN_BANNER` | DAZN バナー画像 URL | A8.net → DAZN プログラム |
| `VITE_AFFILIATE_RAKUTEN_URL` | 楽天アフィリエイトリンク | 楽天アフィリエイト |
| `VITE_AFFILIATE_AMAZON_URL` | Amazon アソシエイトリンク | Amazon アソシエイト |
| `VITE_AFFILIATE_CUSTOM_URL` | その他カスタムアフィリエイトURL | 任意 |

### 機能拡張（設定すると Google Calendar API 直接書き込みが有効化）

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth クライアント ID | Google Cloud Console |

---

## Googleカレンダー連携・iCal フィード

本サイトには以下の Googleカレンダー連携機能が実装されています。

| 機能 | 説明 |
|------|------|
| 個別試合をカレンダーに追加 | 試合一覧の各行の「📅」ボタンをクリック |
| お気に入りチームの全試合を一括追加 | お気に入りタブ → 「Googleカレンダーに追加」ボタン |
| iCal フィード（自動同期） | `/api/ical/<トークン>` を Googleカレンダーに登録すると自動更新 |
| 週間観戦プランナー | 今後7日間の試合にチェックを入れて一括 ICS ダウンロード |

---

*最終更新: 2026年5月 | 海外サッカー日程 (kaigaisoccer.com)*
