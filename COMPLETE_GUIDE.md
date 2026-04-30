# kaigaisoccer.com 運用・収益最大化 完全ガイド

> **対象読者:** サイトオーナー本人。技術的な知識がなくても、このガイドの手順通りに進めれば設定が完了するように書かれています。
>
> **最終更新:** 2026年5月（自動更新12時間おき・25大会対応・ハイライトリンク・時差表示切り替え実装済み）

---

## 目次

1. [現在のサイト仕様](#1-現在のサイト仕様)
2. [Manusでの公開手順（推奨）](#2-manusでの公開手順推奨)
3. [外部サーバー（Cloudflare）への移行手順](#3-外部サーバーcloudflareへの移行手順)
4. [Google AdSense 申請・設定手順](#4-google-adsense-申請設定手順)
5. [アフィリエイト設定手順](#5-アフィリエイト設定手順)
6. [Googleカレンダー連携の設定](#6-googleカレンダー連携の設定)
7. [Google Search Console・SEO設定](#7-google-search-consoleseo設定)
8. [収益化ロードマップ](#8-収益化ロードマップ)
9. [よくある質問・トラブルシューティング](#9-よくある質問トラブルシューティング)

---

## 1. 現在のサイト仕様

### 対応大会一覧（25大会）

| カテゴリ | 大会名 | 国 |
|---|---|---|
| リーグ | プレミアリーグ | イングランド |
| リーグ | チャンピオンシップ（2部） | イングランド |
| リーグ | ラ・リーガ | スペイン |
| リーグ | セリエA | イタリア |
| リーグ | ブンデスリーガ | ドイツ |
| リーグ | リーグ・アン | フランス |
| リーグ | スコティッシュ・プレミアシップ | スコットランド |
| リーグ | エールディビジ | オランダ |
| リーグ | ジュピラー・プロ・リーグ | ベルギー |
| リーグ | プリメイラ・リーガ | ポルトガル |
| リーグ | スュペル・リグ | トルコ |
| カップ戦 | FAカップ | イングランド |
| カップ戦 | EFLカップ（カラバオカップ） | イングランド |
| カップ戦 | コパ・デル・レイ | スペイン |
| カップ戦 | コッパ・イタリア | イタリア |
| カップ戦 | DFBポカール | ドイツ |
| カップ戦 | クープ・ド・フランス | フランス |
| カップ戦 | タサ・デ・ポルトガル | ポルトガル |
| UEFA | チャンピオンズリーグ | 欧州 |
| UEFA | ヨーロッパリーグ | 欧州 |
| UEFA | カンファレンスリーグ | 欧州 |
| 代表戦 | W杯予選 | 世界 |
| 代表戦 | EURO | 欧州 |
| 代表戦 | ネーションズリーグ | 欧州 |
| 代表戦 | 親善試合/その他 | 世界 |

### 主な機能

| 機能 | 説明 |
|---|---|
| 欧州日程タブ | 今後14日間の試合を日本時間で表示 |
| 欧州結果タブ | 直近の試合結果・スコア表示 |
| カップ戦タブ | 全カップ戦の日程・結果 |
| 日本人選手タブ | 日本人選手所属クラブの試合のみ表示 |
| 代表戦タブ | W杯予選・EURO・ネーションズリーグ |
| お気に入りタブ | 登録チームの試合のみ表示 |
| リーグ絞り込み | 複数リーグを選択してフィルタリング |
| チーム名検索 | 日本語・英語両対応 |
| JST/現地時間切り替え | ヘッダー右上のトグルで切り替え |
| ハイライトリンク | 試合終了後にYouTube検索ボタンが表示 |
| Googleカレンダー追加 | 各試合行の📅ボタンで追加 |
| iCalフィード | お気に入りチームの試合を自動同期 |
| 自動データ更新 | 12時間おきに自動取得（現在ラウンド±3節） |

---

## 2. Manusでの公開手順（推奨）

**Manusのビルトインホスティングを使う場合、外部サーバーは不要です。** 無料枠で月間数万PVまで運用できます。

### ステップ1：Publishボタンを押す

1. チャット画面右側の **Management UI** を開く
2. 右上の **Publish** ボタンをクリック
3. ビルドが走り、数十秒〜数分でデプロイ完了

### ステップ2：ドメインを設定する（任意）

初回公開後、**Settings → Domains** から以下が設定できます。

- **サブドメイン変更:** `kaigai-soccer.manus.space` のような覚えやすい名前に変更
- **独自ドメイン接続:** 持っているドメイン（例：`kaigaisoccer.com`）を接続
- **ドメイン新規購入:** Manus内で直接購入・設定まで完結

### ステップ3：環境変数（Secrets）を設定する

**Settings → Secrets** から以下を設定します。AdSense・アフィリエイトの設定は後述の各セクションを参照してください。

| 変数名 | 説明 | 設定タイミング |
|---|---|---|
| `VITE_ADSENSE_CLIENT` | AdSenseパブリッシャーID | AdSense審査通過後 |
| `VITE_ADSENSE_SLOT_TOP` | ヘッダー下広告スロットID | AdSense審査通過後 |
| `VITE_ADSENSE_SLOT_INLINE` | インライン広告スロットID | AdSense審査通過後 |
| `VITE_AFFILIATE_STREAMING_URL` | DAZN等の配信サービスアフィリエイトURL | A8.net登録後 |
| `VITE_AFFILIATE_MERCH_URL` | グッズ・ユニフォームアフィリエイトURL | 楽天/Amazon登録後 |
| `VITE_AFFILIATE_TRAVEL_URL` | 海外観戦旅行アフィリエイトURL | 旅行AF登録後 |
| `VITE_AFFILIATE_MEMBERSHIP_URL` | サブスク・会員サービスアフィリエイトURL | 各AF登録後 |
| `VITE_GOOGLE_CLIENT_ID` | GoogleカレンダーOAuthクライアントID | Google Cloud設定後 |

> **重要:** 環境変数を設定した後は、必ず再度 **Publish** ボタンを押してください。設定が反映されます。

---

## 3. 外部サーバー（Cloudflare）への移行手順

Manusのホスティングではなく、自分でサーバーを管理したい場合の手順です。**月間50万PVまで完全無料**で運用できます。

> **前提条件:** GitHubアカウント・Cloudflareアカウント（どちらも無料）が必要です。

### 3-1. ソースコードをGitHubにエクスポートする

Manus管理画面から操作します。

1. **Settings → GitHub** を開く
2. **「Export to GitHub」** をクリック
3. リポジトリ名を入力（例：`kaigaisoccer`）
4. **「Create Repository」** をクリック

完了すると `https://github.com/あなたのID/kaigaisoccer` にコードが保存されます。

または、ZIPでダウンロードしてからGitHubにアップロードする方法もあります。

**PowerShell（ZIPダウンロード後にGitHubへアップロードする場合）:**

```powershell
# ZIPを解凍した後、プロジェクトフォルダに移動
cd C:\Users\あなたのユーザー名\Downloads\kaigaisoccer

# Gitの初期化とGitHubへのプッシュ
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/あなたのID/kaigaisoccer.git
git push -u origin main
```

### 3-2. Cloudflareアカウントを作成する

1. [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) にアクセス
2. メールアドレスとパスワードを入力して登録（無料）
3. メール認証を完了

### 3-3. Cloudflare Pagesにデプロイする

1. Cloudflareダッシュボードで **Workers & Pages** をクリック
2. **「Create」→「Pages」→「Connect to Git」** をクリック
3. GitHubアカウントを連携し、`kaigaisoccer` リポジトリを選択
4. ビルド設定を以下のように入力：

| 項目 | 設定値 |
|---|---|
| フレームワークプリセット | None |
| ビルドコマンド | `pnpm build` |
| ビルド出力ディレクトリ | `dist` |
| ルートディレクトリ | `/` |

5. **「Save and Deploy」** をクリック

### 3-4. データベース（D1）を作成する

Cloudflareの無料データベースを作成します。

**PowerShell:**

```powershell
# Wranglerをインストール（初回のみ）
npm install -g wrangler

# Cloudflareにログイン（ブラウザが開きます）
wrangler login

# D1データベースを作成
wrangler d1 create kaigaisoccer-db
```

コマンド実行後に表示される `database_id` をメモしておきます。

次に、プロジェクトフォルダに `wrangler.toml` ファイルを作成します。

**PowerShell:**

```powershell
# wrangler.tomlを作成（database_idは上でメモした値に置き換える）
@"
name = "kaigaisoccer"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "kaigaisoccer-db"
database_id = "ここにdatabase_idを貼り付ける"
"@ | Out-File -FilePath wrangler.toml -Encoding UTF8
```

### 3-5. 環境変数を設定する

Cloudflareダッシュボードで設定します。

1. **Workers & Pages → kaigaisoccer → Settings → Environment variables**
2. **「Add variable」** をクリックして以下を追加：

| 変数名 | 値 | 説明 |
|---|---|---|
| `JWT_SECRET` | 任意の32文字以上のランダム文字列 | セッション署名用（必須） |
| `VITE_ADSENSE_CLIENT` | `ca-pub-XXXXXXXXXX` | AdSense審査通過後に設定 |
| `VITE_ADSENSE_SLOT_TOP` | 広告スロットID | AdSense審査通過後に設定 |
| `VITE_ADSENSE_SLOT_INLINE` | 広告スロットID | AdSense審査通過後に設定 |
| `VITE_AFFILIATE_STREAMING_URL` | DAZNアフィリエイトURL | A8.net登録後に設定 |
| `VITE_AFFILIATE_MERCH_URL` | グッズアフィリエイトURL | 楽天/Amazon登録後に設定 |
| `VITE_AFFILIATE_TRAVEL_URL` | 旅行アフィリエイトURL | 旅行AF登録後に設定 |
| `VITE_AFFILIATE_MEMBERSHIP_URL` | サブスクアフィリエイトURL | 各AF登録後に設定 |
| `VITE_GOOGLE_CLIENT_ID` | GoogleカレンダークライアントID | Google Cloud設定後 |

**JWTシークレットの生成（PowerShell）:**

```powershell
# 安全なランダム文字列を生成
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

### 3-6. 自動データ更新（Cron Trigger）を設定する

Cloudflareの無料Cron機能で12時間おきに自動更新します。

**PowerShell:**

```powershell
# wrangler.tomlにCron設定を追記
Add-Content -Path wrangler.toml -Value @"

[triggers]
crons = ["0 */12 * * *"]
"@
```

または Cloudflareダッシュボードから：

1. **Workers & Pages → kaigaisoccer → Settings → Triggers**
2. **「Add Cron Trigger」** をクリック
3. Cron式に `0 */12 * * *` を入力（12時間おき）
4. **「Add Trigger」** をクリック

### 3-7. 独自ドメインを接続する（任意）

1. **Workers & Pages → kaigaisoccer → Custom domains**
2. **「Set up a custom domain」** をクリック
3. `kaigaisoccer.com` を入力して **「Continue」**
4. DNSレコードの設定案内に従って設定

ドメインをCloudflareで管理している場合は自動設定されます。他社のドメインレジストラ（お名前.com等）で取得している場合は、ネームサーバーをCloudflareに変更するか、CNAMEレコードを追加します。

---

## 4. Google AdSense 申請・設定手順

### 4-1. AdSense申請の前提条件

AdSenseの審査に通るためには以下が必要です。

- サイトが公開されていること（`https://` でアクセスできること）
- コンテンツが十分にあること（試合データが表示されていること）
- プライバシーポリシーページが存在すること（本サイトには `/privacy` に実装済み）
- お問い合わせページが存在すること（本サイトには `/contact` に実装済み）

### 4-2. AdSense申請手順

1. [https://www.google.com/adsense/](https://www.google.com/adsense/) にアクセス
2. **「今すぐ開始」** をクリック
3. Googleアカウントでログイン
4. サイトのURLを入力（例：`https://kaigai-soccer.manus.space`）
5. 支払い情報（住所・氏名）を入力
6. **「AdSenseを開始」** をクリック

申請後、Googleからサイト確認用のコードが発行されます。このコードは**すでにサイトに組み込み済み**のため、追加作業は不要です。

> **審査期間:** 通常2〜4週間。審査中はサイトを削除・変更しないようにしてください。

### 4-3. 審査通過後の設定

審査通過メールが届いたら、AdSense管理画面で広告ユニットを作成します。

1. AdSense管理画面 → **広告 → 広告ユニット → 新しい広告ユニット**
2. **「ディスプレイ広告」** を選択
3. 広告ユニット名を入力（例：`kaigaisoccer-top`）
4. **「作成」** をクリック
5. 表示されたコードから **`data-ad-client`** の値（`ca-pub-XXXXXXXXXX`）と **`data-ad-slot`** の値をメモ

必要な広告スロットは2つです。

| スロット名 | 用途 | 推奨サイズ |
|---|---|---|
| `kaigaisoccer-top` | ヘッダー下（横長バナー） | レスポンシブ |
| `kaigaisoccer-inline` | コンテンツ内（インライン） | レスポンシブ |

### 4-4. 環境変数に設定する

**Manusの場合（Settings → Secrets）:**

| 変数名 | 設定する値 |
|---|---|
| `VITE_ADSENSE_CLIENT` | `ca-pub-XXXXXXXXXX`（AdSense管理画面のパブリッシャーID） |
| `VITE_ADSENSE_SLOT_TOP` | ヘッダー下スロットのID（数字10桁） |
| `VITE_ADSENSE_SLOT_INLINE` | インラインスロットのID（数字10桁） |

設定後に **Publish** ボタンを押すと広告が表示されます。

---

## 5. アフィリエイト設定手順

### 5-1. 収益源の優先順位

| 優先度 | 収益源 | 報酬単価 | 申請先 |
|---|---|---|---|
| ★★★ | DAZN（月額契約） | 1,000〜2,000円/件 | [A8.net](https://www.a8.net/) |
| ★★★ | Google AdSense | クリック単価30〜100円 | [Google AdSense](https://www.google.com/adsense/) |
| ★★☆ | U-NEXT（動画配信） | 2,000〜3,000円/件 | [A8.net](https://www.a8.net/) / afb |
| ★★☆ | 楽天市場（サッカーグッズ） | 購入額の1〜3% | [楽天アフィリエイト](https://affiliate.rakuten.co.jp/) |
| ★★☆ | Amazonアソシエイト（書籍・グッズ） | 購入額の2〜4% | [Amazonアソシエイト](https://affiliate.amazon.co.jp/) |
| ★☆☆ | 海外観戦旅行（エクスペディア等） | 予約額の3〜5% | [バリューコマース](https://www.valuecommerce.ne.jp/) |

### 5-2. DAZN アフィリエイト設定手順

DAZNは最も高単価で、サッカーファン向けサイトとの相性が抜群です。

**手順:**

1. [A8.net](https://www.a8.net/) にアクセスして無料登録
2. メール認証を完了してログイン
3. 上部メニューの **「プログラム」→「プログラム検索」** をクリック
4. 検索ボックスに **「DAZN」** と入力して検索
5. DAZNのプログラムを見つけて **「提携申請」** をクリック
6. 申請理由を入力（例：「海外サッカー日程サイトを運営しており、試合情報と合わせてDAZNを紹介します」）
7. 承認メールが届いたら（通常数日〜1週間）、プログラム管理画面へ
8. **「素材」→「テキストリンク」または「バナー」** からリンクを取得
9. リンクURL（`https://px.a8.net/svt/ejp?a8mat=XXXXXXXX`）をコピー

**環境変数に設定（Manusの場合）:**

| 変数名 | 設定する値 |
|---|---|
| `VITE_AFFILIATE_STREAMING_URL` | A8.netで取得したDAZNのアフィリエイトURL |

設定後に **Publish** ボタンを押すと、サイトの「試合を観るなら」セクションにDAZNへのリンクが表示されます。

### 5-3. 楽天アフィリエイト設定手順

サッカーユニフォーム・グッズの紹介に使います。

1. [楽天アフィリエイト](https://affiliate.rakuten.co.jp/) にアクセス
2. 楽天IDでログイン（楽天IDがない場合は無料登録）
3. **「リンク作成」** をクリック
4. 紹介したい商品（例：サッカーユニフォームカテゴリ）のURLを入力
5. 生成されたアフィリエイトURLをコピー

**環境変数に設定（Manusの場合）:**

| 変数名 | 設定する値 |
|---|---|
| `VITE_AFFILIATE_MERCH_URL` | 楽天アフィリエイトで取得したURL |

### 5-4. Amazonアソシエイト設定手順

サッカー書籍・グッズの紹介に使います。

1. [Amazonアソシエイト](https://affiliate.amazon.co.jp/) にアクセス
2. Amazonアカウントでログイン
3. 申請フォームに必要事項を入力（サイトURL・紹介方法等）
4. 審査通過後（通常数日）、管理画面でリンクを作成
5. サッカーカテゴリのURLを生成してコピー

**環境変数に設定（Manusの場合）:**

| 変数名 | 設定する値 |
|---|---|
| `VITE_AFFILIATE_MERCH_URL` | Amazonアソシエイトで取得したURL（楽天と同じ変数に設定。どちらか一方を選ぶ） |

### 5-5. U-NEXT アフィリエイト設定手順

WOWOWやU-NEXTでサッカーを視聴できるため、DAZNと組み合わせて紹介できます。

1. [A8.net](https://www.a8.net/) にログイン
2. プログラム検索で **「U-NEXT」** を検索
3. 提携申請 → 承認後にリンクを取得

**環境変数に設定（Manusの場合）:**

| 変数名 | 設定する値 |
|---|---|
| `VITE_AFFILIATE_MEMBERSHIP_URL` | U-NEXTのアフィリエイトURL |

### 5-6. アフィリエイト設定後の表示確認

環境変数を設定して **Publish** した後、サイト下部の「収益化セクション」に各アフィリエイトバナーが表示されます。**URLが設定されていないサービスは自動的に非表示**になるため、設定した分だけ表示されます。

---

## 6. Googleカレンダー連携の設定

### 6-1. 現在の動作

`VITE_GOOGLE_CLIENT_ID` が**未設定の場合**でも、試合行の📅ボタンを押すと `.ics` ファイルがダウンロードされ、Googleカレンダーに手動でインポートできます。

`VITE_GOOGLE_CLIENT_ID` を設定すると、ボタン1つで**直接Googleカレンダーに追加**できるようになります。

### 6-2. Google Cloud Consoleでの設定手順

1. [https://console.cloud.google.com/](https://console.cloud.google.com/) にアクセス
2. 上部の **「プロジェクトを選択」→「新しいプロジェクト」** をクリック
3. プロジェクト名に `kaigaisoccer` と入力して **「作成」**
4. 左メニュー **「APIとサービス」→「ライブラリ」** をクリック
5. 検索ボックスに **「Google Calendar API」** と入力
6. **「Google Calendar API」** をクリックして **「有効にする」**
7. 左メニュー **「APIとサービス」→「認証情報」** をクリック
8. **「認証情報を作成」→「OAuthクライアントID」** をクリック
9. アプリケーションの種類：**「ウェブアプリケーション」** を選択
10. 名前：`kaigaisoccer`
11. **「承認済みのJavaScriptオリジン」** に以下を追加：
    - `https://kaigai-soccer.manus.space`（Manusのドメイン）
    - `https://kaigaisoccer.com`（独自ドメインを使う場合）
12. **「作成」** をクリック
13. 表示された **クライアントID**（`XXXXXXXXXX.apps.googleusercontent.com`）をコピー

**環境変数に設定（Manusの場合）:**

| 変数名 | 設定する値 |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | `XXXXXXXXXX.apps.googleusercontent.com` |

---

## 7. Google Search Console・SEO設定

### 7-1. Google Search Consoleへの登録

サイトをGoogleに認識させ、検索順位を確認するために設定します。

1. [https://search.google.com/search-console/](https://search.google.com/search-console/) にアクセス
2. Googleアカウントでログイン
3. **「プロパティを追加」** をクリック
4. **「URLプレフィックス」** を選択し、サイトURLを入力
5. 確認方法で **「HTMLタグ」** を選択
6. 表示されたメタタグをコピー（`<meta name="google-site-verification" content="XXXXXXXXXX" />`）
7. このメタタグをManusのチャットに貼り付けて「Search Console確認コードを設定してください」と伝えると設定します
8. Search Consoleに戻り **「確認」** をクリック

### 7-2. サイトマップの送信

サイトマップは `/sitemap.xml` で自動生成されています。

1. Search Console → 左メニュー **「サイトマップ」**
2. サイトマップURLに `sitemap.xml` と入力
3. **「送信」** をクリック

### 7-3. 狙うべきキーワード

本サイトが上位表示を狙えるキーワードです。

| キーワード | 月間検索数（推定） | 難易度 |
|---|---|---|
| 海外サッカー 日程 | 5,000〜10,000 | 中 |
| プレミアリーグ 日程 | 10,000〜50,000 | 高 |
| CL 日程 | 5,000〜10,000 | 中 |
| 日本人選手 試合 日程 | 1,000〜5,000 | 低 |
| ○○ vs △△ 何時 | 1,000〜5,000 | 低 |
| チャンピオンシップ 日程 | 1,000〜5,000 | 低 |

### 7-4. 実装済みのSEO対策

以下はすでにサイトに組み込まれています。

- OGPメタタグ（og:title / og:description / og:url）
- Twitter Cardメタタグ
- JSON-LD構造化データ（WebSite / SportsOrganization）
- `sitemap.xml`（`/sitemap.xml` でアクセス可能）
- `robots.txt`（`/robots.txt` でアクセス可能）
- canonical URL

---

## 8. 収益化ロードマップ

### 月間収益試算

| 月間PV | AdSense | DAZN AF | 楽天/Amazon | 合計 |
|---|---|---|---|---|
| 1万PV | 1,000円 | 5,000円 | 1,000円 | **7,000円** |
| 5万PV | 5,000円 | 25,000円 | 5,000円 | **35,000円** |
| 20万PV | 20,000円 | 100,000円 | 20,000円 | **140,000円** |

### フェーズ別ロードマップ

**フェーズ1（公開直後〜1ヶ月）**

1. Manusで **Publish** してサイトを公開
2. **Google AdSense** に申請（審査に2〜4週間かかる）
3. **A8.net** に登録 → **DAZN** アフィリエイトに提携申請
4. **Google Search Console** にサイトを登録・サイトマップ送信
5. X（Twitter）・Instagramでサイトを告知

**フェーズ2（1〜3ヶ月後）**

1. AdSense審査通過 → 環境変数を設定して広告を有効化
2. DAZNアフィリエイト承認 → 環境変数を設定してバナーを有効化
3. **楽天アフィリエイト** または **Amazonアソシエイト** に登録
4. **U-NEXT** アフィリエイトを追加
5. Googleカレンダー連携を設定（利便性向上）

**フェーズ3（3〜6ヶ月後）**

1. 各リーグ・チームの紹介ページ追加（SEOコンテンツ）
2. 海外観戦旅行アフィリエイト追加（高単価）
3. メールマガジン配信（試合前日に今週の注目試合を配信）
4. SNS自動投稿（試合結果をX/Instagramに自動投稿）

---

## 9. よくある質問・トラブルシューティング

### Q. 試合データが表示されない

**原因:** データの自動更新が12時間おきのため、新しいリーグのデータがまだ取得されていない可能性があります。

**対処法:** サイト右上の「くるくるボタン（更新ボタン）」を押すと手動で最新データを取得します。完了まで約5〜10分かかります。

### Q. 絞り込みに特定のリーグが表示されない

**原因:** DBにそのリーグのデータが存在しない場合、絞り込みに表示されません。

**対処法:** 更新ボタンを押してデータを取得してください。

### Q. 自動更新が止まった

**対処法:** Manusのチャットで「データ更新が止まっています」と伝えてください。スケジュールタスクを再設定します。

### Q. 独自ドメインで公開したい

**Manusの場合:** Settings → Domains → 「Add custom domain」からドメインを接続できます。Manus内でドメインの新規購入も可能です。

**Cloudflareの場合:** Workers & Pages → Custom domains から接続できます。

### Q. 翌シーズンのデータは自動で更新される？

はい。TheSportsDBは新シーズンのデータを自動的に追加します。自動更新（12時間おき）が実行されるたびに、現在ラウンド±3節のデータが取得されるため、シーズン移行も自動で対応します。**手動作業は不要です。**

### Q. サイトのソースコードを手元に保存したい

**Management UI → More（⋯）→ Download as ZIP** でダウンロードできます。または **Settings → GitHub** でGitHubリポジトリにエクスポートできます。

### Q. 広告が表示されない

環境変数 `VITE_ADSENSE_CLIENT` が正しく設定されているか確認してください。設定後に **Publish** ボタンを押す必要があります。

### Q. アフィリエイトバナーが表示されない

環境変数 `VITE_AFFILIATE_STREAMING_URL` 等が設定されているか確認してください。URLが設定されていないサービスは自動的に非表示になります。

---

*最終更新: 2026年5月 | 海外サッカー日程 (kaigaisoccer.com)*
