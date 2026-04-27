# 外部サーバー移行・広告収益化 完全ガイド

> 海外サッカー日程サイト（`soccer_schedule_jp`）を外部サーバーで運用し、Google AdSense によるクリック報酬収入を得るための手順書です。

---

## 目次

1. [外部サーバーの選択肢](#1-外部サーバーの選択肢)
2. [Railway へのデプロイ（推奨）](#2-railway-へのデプロイ推奨)
3. [VPS（さくら・ConoHa）へのデプロイ](#3-vpsさくらconoha-へのデプロイ)
4. [データベースの移行](#4-データベースの移行)
5. [Google AdSense の申請と設定](#5-google-adsense-の申請と設定)
6. [サッカー系アフィリエイトの追加収益化](#6-サッカー系アフィリエイトの追加収益化)
7. [独自ドメインの設定](#7-独自ドメインの設定)
8. [運用後のメンテナンス](#8-運用後のメンテナンス)

---

## 1. 外部サーバーの選択肢

本サイトは **Node.js（Express）+ MySQL** 構成です。以下の選択肢を比較します。

| サービス | 月額目安 | 難易度 | 特徴 |
|----------|----------|--------|------|
| **Railway**（推奨） | $5〜 | ★☆☆ | GitHub 連携で自動デプロイ。MySQL も同一プラットフォームで管理可能 |
| **Render** | $7〜 | ★☆☆ | 無料枠あり（スリープあり）。Docker 対応 |
| **さくらの VPS** | 月額 643 円〜 | ★★★ | 国内サーバー。低遅延。自分で設定が必要 |
| **ConoHa VPS** | 月額 880 円〜 | ★★★ | 国内サーバー。コントロールパネルが使いやすい |
| **Xserver VPS** | 月額 1,170 円〜 | ★★★ | 国内最大手。安定性が高い |

**個人運用の場合は Railway が最も手軽です。** 月額 $5（約 750 円）で Node.js + MySQL を一括管理できます。

---

## 2. Railway へのデプロイ（推奨）

### 2-1. 事前準備

1. [GitHub](https://github.com) にアカウントを作成し、プロジェクトを push する。
2. [Railway](https://railway.com) にアクセスし、GitHub アカウントでサインアップする。

### 2-2. プロジェクトのコードを GitHub に push

```bash
# プロジェクトディレクトリで実行
cd soccer_schedule_jp

# Git 初期化（未実施の場合）
git init
git add .
git commit -m "Initial commit"

# GitHub にリポジトリを作成後、push
git remote add origin https://github.com/あなたのユーザー名/soccer-schedule-jp.git
git push -u origin main
```

### 2-3. Railway でプロジェクトを作成

1. Railway ダッシュボードで **「New Project」** をクリック。
2. **「Deploy from GitHub repo」** を選択し、リポジトリを選ぶ。
3. Railway が `Dockerfile` を自動検出してビルドを開始する。

### 2-4. MySQL データベースを追加

1. Railway プロジェクト画面で **「+ Add Service」→「Database」→「MySQL」** を選択。
2. MySQL サービスが起動したら、**「Variables」タブ** で接続情報を確認する。
3. Web サービスの **「Variables」タブ** に以下を設定する：

```
DATABASE_URL=mysql://ユーザー名:パスワード@MySQLホスト:3306/データベース名
JWT_SECRET=openssl rand -hex 32 で生成した値
NODE_ENV=production
PORT=8080
```

> **JWT_SECRET の生成方法（ターミナルで実行）:**
> ```bash
> openssl rand -hex 32
> ```

### 2-5. データベースのマイグレーション実行

Railway の **「Shell」** タブ（または CLI）で以下を実行：

```bash
# マイグレーション SQL を順番に適用
# Railway の MySQL コンソールで実行するか、以下のコマンドを使用
pnpm drizzle-kit migrate
```

または、Railway の MySQL サービスの **「Connect」** タブから接続情報を取得し、ローカルの MySQL クライアントで以下の SQL ファイルを順番に実行：

```
drizzle/0000_tearful_mandarin.sql
drizzle/0001_amazing_venus.sql
drizzle/0002_curious_brood.sql
```

### 2-6. デプロイ確認

Railway が自動的にビルド・デプロイを完了すると、`https://xxx.up.railway.app` のような URL でアクセスできるようになります。

---

## 3. VPS（さくら・ConoHa）へのデプロイ

VPS を使う場合は Docker Compose を利用するのが最も簡単です。

### 3-1. VPS の初期設定

```bash
# Ubuntu 22.04 を選択してサーバーを起動後、SSH で接続
ssh root@サーバーのIPアドレス

# Docker のインストール
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Docker Compose のインストール
apt-get install -y docker-compose-plugin
```

### 3-2. コードをサーバーに転送

```bash
# ローカルから SCP でアップロード（または Git を使用）
scp -r ./soccer_schedule_jp root@サーバーIP:/opt/soccer_schedule_jp

# または Git を使う場合
git clone https://github.com/あなたのユーザー名/soccer-schedule-jp.git /opt/soccer_schedule_jp
```

### 3-3. 環境変数の設定

```bash
cd /opt/soccer_schedule_jp

# env-template.txt を .env にコピーして編集
cp env-template.txt .env
nano .env
```

`.env` に以下を設定：

```
DATABASE_URL=mysql://soccer_user:your_password@db:3306/soccer_schedule
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=soccer_schedule
MYSQL_USER=soccer_user
MYSQL_PASSWORD=your_password
JWT_SECRET=openssl rand -hex 32 で生成した値
NODE_ENV=production
PORT=8080
```

### 3-4. Docker Compose で起動

```bash
cd /opt/soccer_schedule_jp

# ビルドして起動
docker compose up -d --build

# ログ確認
docker compose logs -f app
```

### 3-5. データベースのマイグレーション

```bash
# コンテナ内でマイグレーションを実行
docker compose exec app sh -c "
  mysql -h db -u soccer_user -pyour_password soccer_schedule < drizzle/0000_tearful_mandarin.sql &&
  mysql -h db -u soccer_user -pyour_password soccer_schedule < drizzle/0001_amazing_venus.sql &&
  mysql -h db -u soccer_user -pyour_password soccer_schedule < drizzle/0002_curious_brood.sql
"
```

### 3-6. Nginx でリバースプロキシを設定（HTTPS 対応）

```bash
apt-get install -y nginx certbot python3-certbot-nginx

# Nginx 設定ファイルを作成
cat > /etc/nginx/sites-available/soccer << 'EOF'
server {
    listen 80;
    server_name あなたのドメイン.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/soccer /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL 証明書の取得（Let's Encrypt）
certbot --nginx -d あなたのドメイン.com
```

---

## 4. データベースの移行

現在 Manus プラットフォームのデータベースに蓄積されている試合データを外部サーバーに移行する手順です。

### 4-1. Manus からデータをエクスポート

Manus 管理 UI の **「Database」タブ** → **「Export」** からデータをダウンロードするか、以下の方法でエクスポートします。

```bash
# Manus の接続情報を使って mysqldump
mysqldump -h [ManusDBホスト] -u [ユーザー] -p[パスワード] \
  --no-tablespaces \
  soccer_schedule matches sync_log users \
  > backup.sql
```

### 4-2. 外部サーバーにインポート

```bash
# Railway の場合（Railway CLI を使用）
railway run mysql < backup.sql

# VPS の場合
mysql -h localhost -u soccer_user -p soccer_schedule < backup.sql
```

### 4-3. 初期データの再取得（推奨）

移行後は、サイトの管理画面または API エンドポイントから試合データを再取得することを推奨します：

```bash
# 全リーグのデータを再同期（サーバー起動後に実行）
curl -X POST https://あなたのドメイン.com/api/scheduled/refresh \
  -H "Cookie: app_session_id=管理者セッションID"
```

---

## 5. Google AdSense の申請と設定

### 5-1. AdSense 申請の前提条件

Google AdSense の審査を通過するには以下が必要です：

| 条件 | 本サイトの状況 |
|------|----------------|
| 独自ドメインを使用している | 要設定（`kaigai-soccer.manus.space` は不可） |
| オリジナルコンテンツがある | ✅ 試合データ・日本語表示 |
| プライバシーポリシーページがある | 要追加 |
| 問い合わせページがある | 要追加 |
| 18 歳以上 | 申請者の条件 |
| コンテンツが Google ポリシーに準拠 | ✅ スポーツ情報サイト |

> **重要:** `manus.space` サブドメインでは AdSense 審査を申請できません。独自ドメイン（例: `kaigai-soccer.com`）が必要です。

### 5-2. 独自ドメインの取得

1. [お名前.com](https://www.onamae.com/) や [Xserver ドメイン](https://www.xdomain.ne.jp/) でドメインを取得（年額 1,000〜2,000 円程度）。
2. DNS 設定でサーバーの IP アドレスを指定する。

### 5-3. プライバシーポリシーページの追加

AdSense 審査に必要なプライバシーポリシーページを追加してください。以下のテンプレートを参考にしてください：

```
本サイトでは、Google AdSense を利用して広告を配信しています。
Google AdSense は Cookie を使用して、ユーザーの興味に基づいた広告を表示します。
詳細は Google のプライバシーポリシーをご確認ください。
```

### 5-4. AdSense アカウントの作成と申請

1. [Google AdSense](https://www.google.com/adsense/) にアクセス。
2. Google アカウントでログインし、「今すぐ開始」をクリック。
3. サイトの URL（独自ドメイン）を入力して申請。
4. 審査コード（`<meta>` タグ）を `client/index.html` の `<head>` 内に追加。
5. 審査完了（通常 1〜2 週間）を待つ。

### 5-5. 審査通過後の設定

審査が通過したら、以下の手順で広告を有効化します：

**① `client/index.html` の AdSense スクリプトを有効化**

```html
<!-- コメントアウトを解除し、ca-pub-XXXXXXXXXXXXXXXXX を実際の値に変更 -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```

**② 環境変数を設定**

Railway または VPS の環境変数に以下を追加：

```
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT_HORIZONTAL=広告ユニットのスロットID（10桁の数字）
VITE_ADSENSE_SLOT_RECTANGLE=広告ユニットのスロットID
VITE_ADSENSE_SLOT_INFEED=広告ユニットのスロットID
```

> **スロット ID の取得方法:**
> AdSense 管理画面 → 「広告」→「広告ユニット」→「新しい広告ユニットを作成」→ コードをコピー

**③ 再デプロイ**

環境変数を設定後、サービスを再デプロイすると広告が表示されます。

### 5-6. 広告の配置（実装済み）

本サイトには以下の広告スロットが実装済みです：

| 位置 | スロット種別 | 表示タイミング |
|------|-------------|----------------|
| タブナビゲーション直下 | 横長バナー（`horizontal`） | 常時 |
| 試合一覧の 3 日ごと | インフィード（`infeed`） | 3 日分表示ごと |
| フッター直上 | 横長バナー（`horizontal`） | 常時 |

---

## 6. サッカー系アフィリエイトの追加収益化

AdSense のクリック報酬に加え、以下のアフィリエイトプログラムを組み合わせることで収益を増やせます。

### 6-1. 動画配信サービス（高単価・推奨）

| サービス | 報酬単価 | ASP | 特徴 |
|----------|----------|-----|------|
| **DAZN** | 1,000〜2,000 円/件 | A8.net / バリューコマース | 欧州サッカー全試合配信 |
| **U-NEXT サッカーパック** | 2,000〜3,000 円/件 | A8.net / afb | 高単価 |
| **スカパー！** | 1,000〜2,000 円/件 | A8.net | 代表戦・CL 配信 |
| **J SPORTS** | 1,000 円/件 | A8.net | ブンデスリーガ等 |

> **サッカー日程サイトとの相性:** 試合日程を確認したユーザーが「試合を見たい」と思った瞬間に動画配信サービスの広告を表示できるため、コンバージョン率が高い傾向があります。

### 6-2. スポーツ用品（中単価）

| サービス | 報酬率 | ASP |
|----------|--------|-----|
| **ユニオンスポーツ** | 購入額の 5〜10% | A8.net |
| **楽天スポーツ** | 購入額の 1〜3% | 楽天アフィリエイト |
| **Amazon スポーツ** | 購入額の 2〜4% | Amazon アソシエイト |

### 6-3. バナー広告の実装方法

アフィリエイトバナーを追加する場合は、`AdBanner` コンポーネントを拡張するか、専用のバナーコンポーネントを作成します：

```tsx
// client/src/components/AffiliateBanner.tsx の例
export function DaznBanner() {
  return (
    <a
      href="https://www.dazn.com/?utm_source=affiliate&utm_medium=banner&utm_campaign=soccer_schedule"
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="block"
    >
      <img
        src="DAZNのアフィリエイトバナー画像URL"
        alt="DAZN - 欧州サッカーを見るなら"
        className="w-full rounded"
      />
    </a>
  );
}
```

---

## 7. 独自ドメインの設定

### 7-1. DNS 設定（Railway の場合）

1. Railway プロジェクトの **「Settings」→「Domains」** で独自ドメインを追加。
2. ドメイン管理会社の DNS 設定で CNAME レコードを追加：
   ```
   CNAME  @  xxx.up.railway.app
   ```

### 7-2. `client/index.html` の canonical URL を更新

```html
<!-- 独自ドメインに変更 -->
<link rel="canonical" href="https://あなたのドメイン.com/" />
```

---

## 8. 運用後のメンテナンス

### 8-1. 試合データの自動更新

現在、Manus プラットフォームでは毎週火曜日 5:00 JST に自動更新スケジュールが設定されています。外部サーバーに移行後は、以下のいずれかの方法で自動更新を設定してください。

**Railway の場合（Cron Job）:**

Railway の **「+ Add Service」→「Cron Job」** で以下を設定：

```
スケジュール: 0 20 * * 0  （毎週日曜 20:00 UTC = 月曜 5:00 JST）
コマンド: curl -X POST http://app:8080/api/scheduled/refresh
```

**VPS の場合（crontab）:**

```bash
# crontab -e で編集
0 20 * * 0 curl -X POST http://localhost:8080/api/scheduled/refresh
```

### 8-2. バックアップ

```bash
# データベースの定期バックアップ（VPS の場合）
0 3 * * * mysqldump -u soccer_user -p'パスワード' soccer_schedule > /backup/soccer_$(date +\%Y\%m\%d).sql
```

### 8-3. SSL 証明書の自動更新（VPS の場合）

```bash
# Let's Encrypt の自動更新（certbot が自動設定）
certbot renew --dry-run
```

---

## まとめ

| ステップ | 作業内容 | 難易度 |
|----------|----------|--------|
| 1 | Railway または VPS にデプロイ | ★☆☆〜★★★ |
| 2 | 独自ドメインを取得・設定 | ★☆☆ |
| 3 | プライバシーポリシーページを追加 | ★☆☆ |
| 4 | Google AdSense に申請 | ★☆☆ |
| 5 | 審査通過後に環境変数を設定して再デプロイ | ★☆☆ |
| 6 | DAZN 等のアフィリエイトバナーを追加 | ★★☆ |

**予想収益（目安）:**

月間 PV が 10,000 の場合、AdSense のクリック率 1%・単価 20 円で計算すると月額 2,000 円程度。DAZN アフィリエイトが月 5 件成約すれば追加で 5,000〜10,000 円の収益が見込めます。

---

*このガイドは 2026 年 4 月時点の情報をもとに作成しています。各サービスの料金・仕様は変更される場合があります。*
