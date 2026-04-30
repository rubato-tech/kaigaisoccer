# 海外サッカー日程サイト — 外部サーバー運用・収益最大化 完全ガイド

> **ドメイン**: `kaigaisoccer.com`（取得済み）  
> **目的**: 完全自動化・運用コスト最小・収益最大化

---

## 目次

1. [アーキテクチャ概要](#1-アーキテクチャ概要)
2. [外部サーバーへのデプロイ手順](#2-外部サーバーへのデプロイ手順)
3. [自動データ更新の仕組み](#3-自動データ更新の仕組み)
4. [Google AdSense 申請手順](#4-google-adsense-申請手順)
5. [アフィリエイト収益化戦略](#5-アフィリエイト収益化戦略)
6. [収益最大化ロードマップ](#6-収益最大化ロードマップ)
7. [SEO 対策チェックリスト](#7-seo-対策チェックリスト)
8. [環境変数一覧](#8-環境変数一覧)

---

## 1. アーキテクチャ概要

```
[TheSportsDB API]
       ↓ 毎週火曜 5:00 JST（自動）
[スケジュールタスク]
       ↓ POST /api/scheduled/refresh
[Express サーバー]
       ↓ MySQL / TiDB
[React フロントエンド]
       ↓
[ユーザー] ← Google カレンダー連携 / iCal フィード
```

### 対応リーグ・大会（計18大会）

| カテゴリ | 大会名 |
|---------|--------|
| 欧州5大リーグ | プレミアリーグ / ラ・リーガ / セリエA / ブンデスリーガ / リーグ・アン |
| UEFA大会 | チャンピオンズリーグ / ヨーロッパリーグ / カンファレンスリーグ |
| 各国カップ戦 | FAカップ / コパ・デル・レイ / コッパ・イタリア / DFBポカール / クープ・ド・フランス |
| 日本人所属リーグ | スコットランド / オランダ / ベルギー / ポルトガル（タサ・デ・ポルトガル含む） |
| 代表戦 | 欧州・南米・アジア主要代表 |

---

## 2. 外部サーバーへのデプロイ手順

### 方法A: Railway（推奨・最も簡単）

**料金**: 月額 $5〜（Hobby プラン）

```bash
# 1. Railway CLI をインストール
npm install -g @railway/cli

# 2. ログイン
railway login

# 3. プロジェクト作成
railway init

# 4. MySQL データベースを追加
railway add --plugin mysql

# 5. 環境変数を設定（下記「環境変数一覧」参照）
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway variables set OWNER_OPEN_ID=<あなたのManus OpenID>
railway variables set OWNER_NAME=<あなたの名前>
railway variables set NODE_ENV=production

# 6. デプロイ
railway up

# 7. カスタムドメインを設定
# Railway ダッシュボード → Settings → Domains → Add Domain
# kaigaisoccer.com を追加し、DNS を Railway に向ける
```

**DNS 設定（お名前.com / Cloudflare 等）**:

```
Type: CNAME
Name: @
Value: <Railway が発行するドメイン>.railway.app
```

**マイグレーション実行（初回のみ）**:

```bash
# Railway Shell で実行
railway run -- node -e "
const { createConnection } = require('mysql2/promise');
require('dotenv/config');
async function run() {
  const conn = await createConnection(process.env.DATABASE_URL);
  const fs = require('fs');
  for (const f of ['0000','0001','0002','0003'].map(n => \`drizzle/\${n}_*.sql\`)) {
    const files = require('glob').sync(f);
    for (const file of files) {
      await conn.execute(fs.readFileSync(file, 'utf8'));
    }
  }
  await conn.end();
  console.log('Migration complete');
}
run().catch(console.error);
"
```

---

### 方法B: VPS（Xserver VPS / ConoHa / さくら）

**料金**: 月額 880円〜（Xserver VPS 2GBプラン）

```bash
# 1. Ubuntu 22.04 でサーバーを起動後、SSH 接続
ssh root@<サーバーIP>

# 2. 必要パッケージをインストール
apt update && apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx git

# 3. プロジェクトをクローン（GitHub 経由）
git clone https://github.com/<あなたのGitHub>/soccer_schedule_jp.git /opt/kaigaisoccer
cd /opt/kaigaisoccer

# 4. 環境変数ファイルを作成
cp env-template.txt .env
nano .env  # 各値を設定

# 5. Docker で起動
docker-compose up -d --build

# 6. マイグレーション実行（初回のみ）
docker-compose exec app sh -c "
  mysql -h db -u soccer_user -p\$MYSQL_PASSWORD soccer_schedule < drizzle/0000_tearful_mandarin.sql
  mysql -h db -u soccer_user -p\$MYSQL_PASSWORD soccer_schedule < drizzle/0001_amazing_venus.sql
  mysql -h db -u soccer_user -p\$MYSQL_PASSWORD soccer_schedule < drizzle/0002_curious_brood.sql
  mysql -h db -u soccer_user -p\$MYSQL_PASSWORD soccer_schedule < drizzle/0003_chemical_jack_power.sql
"

# 7. Nginx + SSL 設定
cat > /etc/nginx/sites-available/kaigaisoccer << 'EOF'
server {
    server_name kaigaisoccer.com www.kaigaisoccer.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
ln -s /etc/nginx/sites-available/kaigaisoccer /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 8. SSL 証明書取得（Let's Encrypt）
certbot --nginx -d kaigaisoccer.com -d www.kaigaisoccer.com

# 9. 自動更新 cron 設定
(crontab -l 2>/dev/null; echo "0 20 * * 0 curl -s -X POST http://localhost:3000/api/scheduled/refresh") | crontab -
```

---

### 方法C: Render（無料枠あり・スリープあり）

プロジェクトルートの `render.yaml` を使用してデプロイ。

---

## 3. 自動データ更新の仕組み

本サイトは **完全自動化** されています。一度デプロイすれば追加作業は不要です。

### 自動更新スケジュール

| タイミング | 内容 |
|-----------|------|
| 毎週火曜 5:00 JST | 全リーグの試合データを TheSportsDB から取得・更新 |
| 翌シーズン | TheSportsDB が新シーズンのデータを公開次第、自動取得 |

> **翌シーズン対応**: TheSportsDB は毎年6〜7月に新シーズンのデータを公開します。本サイトは `eventsround.php` API でラウンドごとに取得するため、新シーズンのデータが公開されると次回の自動更新時に自動的に反映されます。手動作業は不要です。

### 手動更新（必要な場合）

```bash
# サイト内の「再読み込み」ボタンをクリック
# または管理者として以下のエンドポイントを叩く
curl -X POST https://kaigaisoccer.com/api/scheduled/refresh \
  -H "Cookie: app_session_id=<セッションID>"
```

---

## 4. Google AdSense 申請手順

### 申請前チェックリスト

- [x] 独自ドメイン取得済み（kaigaisoccer.com）
- [x] プライバシーポリシーページ実装済み（/privacy）
- [x] お問い合わせページ実装済み（/contact）
- [x] SSL 証明書設定（HTTPS）
- [ ] コンテンツ量: 3ヶ月以上の運用実績（目安）

### 申請手順

1. [Google AdSense](https://www.google.com/adsense/) にアクセス
2. 「今すぐ開始」→ サイト URL に `https://kaigaisoccer.com` を入力
3. 審査コードを `client/index.html` の `<head>` 内に貼り付け
4. 審査通過後（1〜2週間）、`client/src/components/AdBanner.tsx` の設定を更新

### AdBanner.tsx の設定変更（審査通過後）

```tsx
// client/src/components/AdBanner.tsx の先頭付近を変更
const ADSENSE_CLIENT = "ca-pub-XXXXXXXXXXXXXXXXX";  // あなたのパブリッシャーID
const AD_SLOTS = {
  horizontal: "XXXXXXXXXX",  // 横長バナーのスロットID
  rectangle: "XXXXXXXXXX",   // レクタングルのスロットID
  infeed: "XXXXXXXXXX",      // インフィードのスロットID
};
const IS_ADSENSE_ACTIVE = true;  // false → true に変更
```

---

## 5. アフィリエイト収益化戦略

### 推奨アフィリエイト（収益性順）

| サービス | 報酬単価 | 特徴 | 申請先 |
|---------|---------|------|--------|
| **DAZN** | 1,000〜2,000円/件 | サッカーファン直撃・最高効率 | A8.net / バリューコマース |
| **U-NEXT** | 2,000〜3,000円/件 | 高単価・CL配信あり | A8.net / afb |
| **スカパー！** | 1,000〜2,000円/件 | 代表戦・CL配信 | A8.net |
| **Amazon** | 商品価格の2〜8% | ユニフォーム・グッズ | Amazon アソシエイト |

### バナー設置例（DAZN）

```tsx
// client/src/components/AffiliateBanner.tsx を新規作成
export function DAZNBanner() {
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-border">
      <a
        href="https://www.dazn.com/?utm_source=affiliate&utm_medium=banner&utm_campaign=kaigaisoccer"
        target="_blank"
        rel="noopener noreferrer sponsored"
      >
        <img
          src="https://a8.net/path/to/dazn-banner.gif"
          alt="DAZN - 海外サッカーをライブ観戦"
          className="w-full"
        />
      </a>
    </div>
  );
}
```

### 設置推奨箇所

1. **試合一覧の下** — 観戦意欲が高まるタイミング
2. **UEFA 大会・代表戦タブ** — 視聴需要が高い
3. **お気に入りタブ** — 「このチームの試合を DAZN で観る」CTA ボタン

---

## 6. 収益最大化ロードマップ

### フェーズ1（〜3ヶ月）: 基盤構築

- [x] サイト公開・独自ドメイン設定（kaigaisoccer.com）
- [x] プライバシーポリシー・お問い合わせページ
- [x] 広告スロット実装済み（AdBanner コンポーネント）
- [ ] Google AdSense 申請・審査通過
- [ ] DAZN アフィリエイト登録・バナー設置

### フェーズ2（3〜6ヶ月）: SEO 強化

- [ ] Google Search Console 登録・サイトマップ送信
- [ ] 各リーグ・チームの紹介ページ追加（SEO コンテンツ）
- [ ] Core Web Vitals 最適化（LCP < 2.5s）

### フェーズ3（6ヶ月〜）: 収益拡大

- [ ] メールマガジン（試合前日に配信）
- [ ] プッシュ通知（試合開始1時間前）
- [ ] 有料プラン（広告非表示・追加機能）

### 月間収益試算

| 月間PV | AdSense | DAZN AF | 合計 |
|--------|---------|---------|------|
| 1万PV | 1,000円 | 5,000円 | 6,000円 |
| 5万PV | 5,000円 | 25,000円 | 30,000円 |
| 20万PV | 20,000円 | 100,000円 | 120,000円 |

---

## 7. SEO 対策チェックリスト

### 重要キーワード（狙うべき検索クエリ）

```
「海外サッカー 日程」「プレミアリーグ 日程」「CL 日程」
「○○ vs △△ 何時」「○○ 試合 日本時間」
「欧州サッカー 今週」「カップ戦 日程」
```

### 実装チェックリスト

```bash
# 1. サイトマップを public/sitemap.xml に追加
# 2. robots.txt を public/robots.txt に追加
# 3. OGP メタタグを index.html に設定
# 4. Google Search Console に登録
# 5. canonical URL を kaigaisoccer.com に設定
```

### OGP 設定例（client/index.html）

```html
<meta property="og:title" content="海外サッカー日程 | kaigaisoccer.com" />
<meta property="og:description" content="欧州5大リーグ・CL・カップ戦・代表戦の試合日程を日本時間で一覧表示" />
<meta property="og:url" content="https://kaigaisoccer.com/" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
```

---

## 8. 環境変数一覧

```env
# 必須
DATABASE_URL=mysql://user:pass@host:3306/dbname
JWT_SECRET=<openssl rand -hex 32 で生成>
OWNER_OPEN_ID=<Manus OpenID>
OWNER_NAME=<あなたの名前>

# Manus OAuth（Manus プラットフォームから自動注入）
VITE_APP_ID=<OAuth App ID>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im

# AdSense（審査通過後に設定）
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT_HORIZONTAL=XXXXXXXXXX
VITE_ADSENSE_SLOT_RECTANGLE=XXXXXXXXXX
VITE_ADSENSE_SLOT_INFEED=XXXXXXXXXX

# オプション
NODE_ENV=production
PORT=3000
```

---

## 付録: Googleカレンダー連携・iCal フィード

本サイトには以下の Googleカレンダー連携機能が実装されています。

| 機能 | 説明 |
|------|------|
| 個別試合をカレンダーに追加 | 試合一覧の各行の「📅」ボタンをクリック |
| お気に入りチームの全試合を一括追加 | お気に入りタブ → 「Googleカレンダーに追加」ボタン |
| iCal フィード（自動同期） | `/api/ical/<ユーザーID>` を Googleカレンダーに登録すると自動更新 |

### iCal フィードの登録方法

1. サイトにログイン後、お気に入りタブで iCal URL をコピー
2. Googleカレンダー → 「他のカレンダー」→「URL で追加」
3. コピーした URL を貼り付けて「カレンダーを追加」

---

*最終更新: 2026年4月 | 海外サッカー日程 (kaigaisoccer.com)*
