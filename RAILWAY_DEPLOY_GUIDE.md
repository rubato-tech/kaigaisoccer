# kaigaisoccer.com — Railway 移行・運用 完全ガイド

> **対象読者**: Windows PC を使用している方。PowerShell のコマンドはそのままコピー＆ペーストで実行できます。
> **所要時間**: 初回セットアップ 約30〜60分
> **月額費用**: Railway Hobby プラン $5/月（約750円）固定

---

## 目次

1. [Railway とは・なぜ Railway か](#1-railway-とはなぜ-railway-か)
2. [事前準備](#2-事前準備)
3. [Railway アカウント作成](#3-railway-アカウント作成)
4. [MySQL データベースの作成](#4-mysql-データベースの作成)
5. [アプリのデプロイ](#5-アプリのデプロイ)
6. [環境変数の設定（最重要）](#6-環境変数の設定最重要)
7. [データベースの初期化（テーブル作成）](#7-データベースの初期化テーブル作成)
8. [自動更新（Cron）の設定](#8-自動更新cronの設定)
9. [独自ドメイン（kaigaisoccer.com）の接続](#9-独自ドメインkaigaisoccercomの接続)
10. [AdSense・アフィリエイトの設定](#10-adsenseアフィリエイトの設定)
11. [Manus 認証について（重要）](#11-manus-認証について重要)
12. [運用・メンテナンス](#12-運用メンテナンス)
13. [料金の目安](#13-料金の目安)
14. [トラブルシューティング](#14-トラブルシューティング)

---

## 1. Railway とは・なぜ Railway か

Railway は Node.js アプリと MySQL データベースをまとめてホスティングできるクラウドサービスです。GitHub リポジトリと接続するだけで自動デプロイが設定でき、コードを push するたびに本番環境が自動更新されます。

このアプリ（kaigaisoccer.com）は Express サーバー + MySQL + React のフルスタック構成のため、静的ファイルのみ対応の Cloudflare Pages では動作しません。Railway は現在の全機能をそのまま動作させられる数少ない選択肢のひとつです。

---

## 2. 事前準備

以下が揃っていることを確認してください。

| 必要なもの | 確認方法 |
|---|---|
| GitHub アカウント | https://github.com にログインできること |
| GitHub リポジトリ | `rubato-tech/kaigaisoccer` にコードが push 済みであること |
| クレジットカード | Railway の Hobby プラン登録に必要 |
| Node.js（ローカル作業用） | PowerShell で `node -v` を実行してバージョンが表示されること |

### Node.js のインストール（未インストールの場合）

```powershell
# Windows の場合、winget でインストール
winget install OpenJS.NodeJS.LTS
```

インストール後、PowerShell を再起動してから `node -v` で確認してください。

---

## 3. Railway アカウント作成

1. https://railway.com にアクセスし、**「Start a New Project」** をクリック
2. **「Sign in with GitHub」** を選択して GitHub アカウントでログイン
3. 画面右上のアイコンから **「Billing」** → **「Upgrade to Hobby」** をクリック
4. クレジットカード情報を入力して $5/月のプランに登録

> **注意**: 無料トライアルは $1 分のクレジットのみで、すぐに使い切ります。最初から Hobby プランに登録することを推奨します。

---

## 4. MySQL データベースの作成

1. Railway ダッシュボードで **「New Project」** をクリック
2. **「Provision MySQL」** を選択（検索欄に「MySQL」と入力）
3. MySQL サービスが作成されたら、そのサービスをクリック
4. **「Variables」** タブを開き、以下の値をメモしておく

| 変数名 | 用途 |
|---|---|
| `MYSQL_URL` | アプリから DB に接続するための URL |
| `MYSQLHOST` | ホスト名 |
| `MYSQLPORT` | ポート番号 |
| `MYSQLDATABASE` | データベース名 |
| `MYSQLUSER` | ユーザー名 |
| `MYSQLPASSWORD` | パスワード |

> Railway の MySQL サービスは `MYSQL_URL` という形式で接続文字列を提供します。アプリ側では `DATABASE_URL` という変数名を使うため、後の手順でマッピングします。

---

## 5. アプリのデプロイ

### 5-1. 同じプロジェクトにアプリを追加

1. 先ほど作成した MySQL プロジェクトの画面で **「+ New」** → **「GitHub Repo」** をクリック
2. `rubato-tech/kaigaisoccer` を選択
3. **「Deploy Now」** をクリック

### 5-2. ビルド・スタートコマンドの確認

Railway は `package.json` の `build` と `start` スクリプトを自動検出します。このアプリの設定は以下の通りで、変更不要です。

```json
"build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
"start": "NODE_ENV=production node dist/index.js"
```

### 5-3. デプロイログの確認

アプリサービスをクリックし **「Deployments」** タブでビルドログを確認します。最初のデプロイは環境変数が未設定のため失敗しますが、次の手順で設定します。

---

## 6. 環境変数の設定（最重要）

アプリサービスの **「Variables」** タブを開き、以下の変数を全て設定します。**全ての必須変数を設定しないとアプリが正常に動作しません。**

---

### 6-1. 必須変数（絶対に設定が必要）

| 変数名 | 設定する値 | 説明 |
|---|---|---|
| `DATABASE_URL` | MySQL サービスの `MYSQL_URL` の値 | DB 接続文字列 |
| `JWT_SECRET` | 下記コマンドで生成したランダム文字列 | セッション署名キー |
| `NODE_ENV` | `production` | 本番モード（この値がないとビルドが壊れる） |

> **`PORT` は設定不要です。** Railway が自動的にポートを割り当てるため、手動設定すると競合する場合があります。削除または未設定のままにしてください。

#### DATABASE_URL の設定方法

1. Railway ダッシュボードで **MySQL サービス** をクリック
2. **「Variables」** タブを開く
3. `MYSQL_URL` の値（`mysql://user:password@host:port/dbname` 形式）をコピー
4. **アプリサービス** の **「Variables」** タブを開く
5. `DATABASE_URL` という名前で、コピーした値を貼り付ける

#### JWT_SECRET の生成方法（PowerShell）

```powershell
# ランダムな64文字の文字列を生成してクリップボードにコピー
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_}) | Set-Clipboard
# クリップボードの内容を確認（これが JWT_SECRET の値）
Get-Clipboard
```

生成された文字列を `JWT_SECRET` の値として Railway に貼り付けてください。

---

### 6-2. Manus 認証関連（ログイン機能に必要）

**この設定がないとサーバーが起動時にエラーを出力します**（`OAUTH_SERVER_URL is not configured` というエラーが出る場合は、この変数が未設定です）。

| 変数名 | 設定する値 | 取得方法 |
|---|---|---|
| `OAUTH_SERVER_URL` | `https://api.manus.im` | **固定値**（そのままコピー） |
| `VITE_OAUTH_PORTAL_URL` | `https://manus.im` | **固定値**（そのままコピー） |
| `VITE_APP_ID` | Manus の App ID（英数字の文字列） | 下記「App ID の取得方法」参照 |
| `OWNER_OPEN_ID` | Manus のユーザー ID | 下記「Owner Open ID の取得方法」参照 |

#### OAUTH_SERVER_URL と VITE_OAUTH_PORTAL_URL（固定値）

この2つは変更不要の固定値です。以下をそのまま Railway に設定してください。

```
OAUTH_SERVER_URL = https://api.manus.im
VITE_OAUTH_PORTAL_URL = https://manus.im
```

#### VITE_APP_ID の取得方法

`VITE_APP_ID` は、このアプリが Manus の認証システムに登録されている ID です。

1. **Manus のブラウザ画面**（このチャット画面）を開く
2. 右上のパネルにある **「Management UI」** アイコンをクリック（または右側のパネルを開く）
3. **「Settings」** → **「General」** を開く
4. **「App ID」** という項目の値をコピーする
   - 例: `RaqPabotonJ74A6GpXWVTN`（英数字22文字程度）
5. Railway の `VITE_APP_ID` にこの値を貼り付ける

#### OWNER_OPEN_ID の取得方法

`OWNER_OPEN_ID` は、サイトオーナー（あなた）の Manus ユーザー ID です。

1. 同じく Manus の **「Settings」** → **「General」** を開く
2. **「Owner Open ID」** または **「User ID」** という項目の値をコピーする
3. Railway の `OWNER_OPEN_ID` にこの値を貼り付ける

> **補足**: `VITE_APP_ID` と `OWNER_OPEN_ID` が分からない場合は、Manus のチャットで「VITE_APP_IDとOWNER_OPEN_IDを教えてください」と質問すると確認できます。

---

### 6-3. AdSense 関連（任意・後から設定可）

AdSense の審査に通過してから設定します。審査前は設定不要です（広告スロットは自動的に非表示になります）。

#### VITE_ADSENSE_CLIENT（パブリッシャー ID）の取得方法

1. https://www.google.com/adsense/ にアクセスしてログイン
2. 左メニューの **「アカウント」** → **「アカウント情報」** を開く
3. **「パブリッシャー ID」** に表示されている `ca-pub-XXXXXXXXXXXXXXXX` 形式の値をコピー
4. Railway の `VITE_ADSENSE_CLIENT` に貼り付ける

#### 広告スロット ID の取得方法

広告スロット ID は、AdSense で広告ユニットを作成するたびに発行される数字（例: `1234567890`）です。

1. AdSense 管理画面 → **「広告」** → **「広告ユニットごと」** をクリック
2. **「新しい広告ユニットを作成」** → 広告の種類を選択
3. 広告ユニット名を入力して **「作成して取得」** をクリック
4. 表示されるコードの中に `data-ad-slot="XXXXXXXXXX"` という部分があり、この数字がスロット ID

各スロットの用途と対応する変数名は以下の通りです。

| 変数名 | 広告の種類 | 推奨サイズ | 配置場所 |
|---|---|---|---|
| `VITE_ADSENSE_SLOT_TOP` | ディスプレイ広告 | レスポンシブ | ページ最上部（ヘッダー下） |
| `VITE_ADSENSE_SLOT_HORIZONTAL` | ディスプレイ広告 | 横長（728×90） | コンテンツ間 |
| `VITE_ADSENSE_SLOT_INLINE` | インフィード広告 | ネイティブ | 試合リスト内 |
| `VITE_ADSENSE_SLOT_RECTANGLE` | ディスプレイ広告 | レクタングル（300×250） | サイドバー相当 |
| `VITE_ADSENSE_SLOT_INFEED` | インフィード広告 | ネイティブ | フィード内 |

> **注意**: 広告ユニットは1つずつ作成する必要があります。最初は `VITE_ADSENSE_SLOT_TOP` 用に1つだけ作成し、動作確認後に残りを追加することを推奨します。

---

### 6-4. アフィリエイト関連（任意・後から設定可）

アフィリエイト URL を設定すると、サイト内に DAZN・楽天・Amazon・U-NEXT の広告バナーが表示されます。未設定の場合は非表示になります。

#### DAZN アフィリエイト（A8.net 経由）

1. https://www.a8.net/ にアクセスして無料会員登録
2. ログイン後、上部メニューの **「プログラム」** → **「プログラム検索」** をクリック
3. 検索欄に「DAZN」と入力して検索
4. DAZN のプログラムが表示されたら **「提携申請」** をクリック（即時承認の場合が多い）
5. 承認後、DAZN のプログラムページで **「広告リンク」** → **「テキストリンク」** を選択
6. 表示されたリンク URL（`https://px.a8.net/...` 形式）をコピー
7. Railway の `VITE_AFFILIATE_STREAMING_URL` に貼り付ける

| 変数名 | 設定する値 | 説明 |
|---|---|---|
| `VITE_AFFILIATE_STREAMING_URL` | A8.net の DAZN アフィリエイトリンク URL | クリックで収益発生 |
| `VITE_AFFILIATE_STREAMING_BANNER` | バナー画像の URL（任意） | バナー表示用 |
| `VITE_AFFILIATE_STREAMING_NAME` | `DAZN` | 表示名 |

#### Amazon アソシエイト

1. https://affiliate.amazon.co.jp/ にアクセスして申請（審査あり・数日かかる）
2. 承認後、アソシエイト ID（例: `kaigaisoccer-22`）が発行される
3. Railway の `VITE_AFFILIATE_AMAZON_TAG` にこの ID を設定する

#### 楽天アフィリエイト

1. https://affiliate.rakuten.co.jp/ にアクセスして登録（即時）
2. アフィリエイト ID（数字）が発行される
3. Railway の `VITE_AFFILIATE_RAKUTEN_ID` に設定する

#### U-NEXT（A8.net 経由）

DAZN と同様に A8.net で「U-NEXT」を検索して提携申請します。取得したリンク URL を `VITE_AFFILIATE_UNEXT_URL` に設定します。

---

### 6-5. Google カレンダー連携（任意・後から設定可）

Google カレンダーへの直接追加機能を有効にするには、Google Cloud Console で OAuth クライアント ID を取得する必要があります。

#### VITE_GOOGLE_CLIENT_ID の取得方法

1. https://console.cloud.google.com/ にアクセスしてログイン（Google アカウントが必要）
2. 上部の **「プロジェクトを選択」** → **「新しいプロジェクト」** をクリック
3. プロジェクト名（例: `kaigaisoccer`）を入力して **「作成」** をクリック
4. 左メニューの **「API とサービス」** → **「ライブラリ」** をクリック
5. 検索欄に「Google Calendar API」と入力して選択 → **「有効にする」** をクリック
6. 左メニューの **「API とサービス」** → **「認証情報」** をクリック
7. **「認証情報を作成」** → **「OAuth クライアント ID」** を選択
8. **「アプリケーションの種類」** で **「ウェブ アプリケーション」** を選択
9. **「承認済みの JavaScript 生成元」** に以下を追加する
   - `https://kaigaisoccer.com`（本番ドメイン）
   - `https://あなたのRailway URL.up.railway.app`（Railway の URL）
10. **「作成」** をクリック
11. 表示された **「クライアント ID」**（`XXXXXXXXXX.apps.googleusercontent.com` 形式）をコピー
12. Railway の `VITE_GOOGLE_CLIENT_ID` に貼り付ける

> **注意**: Google カレンダー連携は設定しなくてもサイトの主要機能（試合日程表示）は動作します。お気に入り機能のカレンダー連携のみ影響します。

---

### 6-6. 全変数の設定チェックリスト

Railway の **「Variables」** タブで以下を確認してください。

**必須（これがないと動かない）:**
- [ ] `DATABASE_URL` — MySQL の接続文字列
- [ ] `JWT_SECRET` — ランダム文字列（64文字推奨）
- [ ] `NODE_ENV` — `production`
- [ ] `OAUTH_SERVER_URL` — `https://api.manus.im`
- [ ] `VITE_OAUTH_PORTAL_URL` — `https://manus.im`
- [ ] `VITE_APP_ID` — Manus の App ID

**推奨（設定すると機能が有効になる）:**
- [ ] `OWNER_OPEN_ID` — Manus のユーザー ID

**任意（後から設定可）:**
- [ ] `VITE_ADSENSE_CLIENT` — AdSense パブリッシャー ID
- [ ] `VITE_ADSENSE_SLOT_TOP` — 広告スロット ID
- [ ] `VITE_AFFILIATE_STREAMING_URL` — DAZN アフィリエイト URL
- [ ] `VITE_GOOGLE_CLIENT_ID` — Google カレンダー連携用

> **`PORT` は設定しないでください。** Railway が自動的に割り当てます。設定すると競合する場合があります。

### 全変数を設定後、再デプロイ

変数を設定したら **「Deploy」** ボタンをクリックして再デプロイします。ビルドが成功すると、Railway が自動的に URL（例: `kaigaisoccer-production.up.railway.app`）を発行します。

---

## 7. データベースの初期化（テーブル作成）

Railway にデプロイしただけでは DB のテーブルが空です。以下の手順でテーブルを作成します。

### 方法A: ローカルから Railway DB に接続してマイグレーション（推奨）

```powershell
# プロジェクトディレクトリに移動（パスは自分の環境に合わせて変更）
cd C:\Users\YourName\kaigaisoccer

# Railway の DATABASE_URL を環境変数に設定（Railway の Variables タブからコピー）
$env:DATABASE_URL = "mysql://user:password@host:port/dbname"

# マイグレーション実行（テーブル作成）
pnpm drizzle-kit push
```

### 方法B: Railway の MySQL に直接接続してSQLを実行

1. Railway の MySQL サービス → **「Connect」** タブ → **「MySQL Client」** をクリック
2. ブラウザ上の MySQL クライアントが開く
3. `drizzle/` フォルダ内の `.sql` ファイルの内容を貼り付けて実行

---

## 8. 自動更新（Cron）の設定

試合データを12時間おきに自動取得するには、外部の Cron サービスを使います。Railway 単体では Cron 機能が別料金（$1/月）のため、**無料の外部サービス** を使います。

### cron-job.org（無料）を使った設定方法

1. https://cron-job.org にアクセスして無料アカウントを作成
2. **「Create Cronjob」** をクリック
3. 以下の設定を入力する

| 項目 | 設定値 |
|---|---|
| Title | kaigaisoccer 自動更新 |
| URL | `https://あなたのRailway URL/api/scheduled/refresh` |
| Schedule | Every 12 hours（カスタムで `0 0,12 * * *` を入力） |
| Request Method | POST |
| Request Headers | `Cookie: app_session_id=【Manus のスケジュールタスク Cookie】` |

> **Cookie の取得方法**: Manus の管理UI でスケジュールタスクを作成すると `SCHEDULED_TASK_COOKIE` という値が自動生成されます。この値を上記の Cookie ヘッダーに使用します。

### 代替手段: GitHub Actions（無料）を使った設定

GitHub リポジトリに以下のファイルを追加することで、GitHub の無料 CI/CD を Cron として使えます。

**ファイルパス**: `.github/workflows/refresh.yml`

```yaml
name: 試合データ自動更新

on:
  schedule:
    # 毎日 0:00 と 12:00 JST（UTC の 15:00 と 3:00）に実行
    - cron: '0 15,3 * * *'
  workflow_dispatch:  # 手動実行も可能

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: データ更新リクエスト送信
        run: |
          curl -X POST \
            -H "Cookie: app_session_id=${{ secrets.SCHEDULED_TASK_COOKIE }}" \
            -H "Content-Type: application/json" \
            https://あなたのRailway URL/api/scheduled/refresh
```

GitHub リポジトリの **Settings → Secrets and variables → Actions** で `SCHEDULED_TASK_COOKIE` を登録してください。

---

## 9. 独自ドメイン（kaigaisoccer.com）の接続

### 9-1. Railway でカスタムドメインを追加

1. Railway のアプリサービス → **「Settings」** タブ → **「Domains」** セクション
2. **「Add Custom Domain」** をクリック
3. `kaigaisoccer.com` と `www.kaigaisoccer.com` を追加
4. Railway が表示する CNAME レコードをメモする

### 9-2. DNS の設定（ドメインレジストラの管理画面で作業）

ドメインを購入したサービス（お名前.com、Xserver、Cloudflare 等）の DNS 管理画面で以下を設定します。

| タイプ | ホスト名 | 値 |
|---|---|---|
| CNAME | `www` | Railway が指定した CNAME 値 |
| CNAME または A | `@`（ルートドメイン） | Railway が指定した値 |

> DNS の反映には最大48時間かかる場合があります。通常は数分〜数時間で完了します。

### 9-3. Manus OAuth のリダイレクト URL を更新

ログイン機能が正常に動作するよう、Manus 側の設定を更新します。

1. Manus の管理UI → **Settings → General**
2. **「Allowed Redirect URLs」** に `https://kaigaisoccer.com` を追加
3. 保存する

---

## 10. AdSense・アフィリエイトの設定

### Google AdSense の申請手順

1. https://www.google.com/adsense/ にアクセスしてアカウントを作成
2. サイト URL として `https://kaigaisoccer.com` を入力
3. 審査用コードが発行される（`ca-pub-XXXXXXXXXXXXXXXX` 形式）
4. Railway の環境変数 `VITE_ADSENSE_CLIENT` にこの値を設定
5. 審査通過後（2〜4週間）、広告ユニットを作成してスロット ID を取得
6. 各 `VITE_ADSENSE_SLOT_*` 変数に対応するスロット ID を設定

> **審査のポイント**: サイトにオリジナルコンテンツが必要です。このサイトは試合日程という実用的なコンテンツがあるため、審査通過の可能性は高いです。プライバシーポリシーとお問い合わせページはすでに実装済みです。

詳細な取得方法は [第6章の AdSense セクション](#6-3-adsense-関連任意後から設定可) を参照してください。

### DAZN アフィリエイトの設定手順

詳細な取得方法は [第6章のアフィリエイトセクション](#6-4-アフィリエイト関連任意後から設定可) を参照してください。

---

## 11. Manus 認証について（重要）

このアプリのログイン機能は Manus OAuth を使用しています。Railway にデプロイしても、ログイン処理は引き続き Manus のサーバーを経由します。

### 動作の仕組み

```
ユーザー → Railway（kaigaisoccer.com）→ Manus OAuth サーバー → Railway に戻る
```

### 注意事項

- Manus のプロジェクトを**削除しない**でください。削除するとログイン機能が停止します
- Manus のプロジェクトは「公開停止」にしても OAuth 機能は継続して動作します
- ログインしていないユーザーでも試合日程の閲覧は可能です（ログインはお気に入り機能・カレンダー連携のみ必要）

### Manus プロジェクトの App ID の確認方法

1. Manus の管理UI を開く（このチャット画面の右側パネル）
2. **Settings → General** を開く
3. **「App ID」** の値をコピーして Railway の `VITE_APP_ID` に設定

---

## 12. 運用・メンテナンス

### コードの更新方法

GitHub に push するだけで自動デプロイされます。

```powershell
# ローカルで変更後
git add .
git commit -m "変更内容の説明"
git push origin main
# → Railway が自動的に検知してビルド・デプロイを開始
```

### データベースのバックアップ

Railway の MySQL サービスには自動バックアップ機能がありません（有料プランのみ）。定期的に手動でバックアップすることを推奨します。

```powershell
# mysqldump でバックアップ（MySQL クライアントが必要）
# DATABASE_URL の各パラメータを使用
mysqldump -h ホスト名 -P ポート番号 -u ユーザー名 -pパスワード データベース名 > backup.sql
```

### ログの確認

Railway ダッシュボード → アプリサービス → **「Logs」** タブでリアルタイムログを確認できます。

### 手動でデータ更新を実行

```powershell
# PowerShell から手動でデータ更新を実行
Invoke-WebRequest -Uri "https://あなたのRailway URL/api/scheduled/refresh" -Method POST -Headers @{"Cookie"="app_session_id=【Cookie値】"}
```

---

## 13. 料金の目安

Railway Hobby プランは **$5/月固定**で、その中に $5 分の使用量クレジットが含まれます。

| リソース | 料金 | 個人サイト規模での目安 |
|---|---|---|
| Webサーバー（512MB RAM） | 約 $2〜3/月 | 常時稼働で月約 $2.5 |
| MySQL（1GB） | 約 $1〜2/月 | 小規模DBで月約 $1 |
| 合計 | **約 $3〜5/月** | $5 クレジット内に収まる |

月間 PV が増えてもサーバーリソースが変わらなければ追加課金は発生しません。急激なアクセス増加（月10万 PV 超）の場合は RAM を増やす必要が生じる可能性があります。

---

## 14. トラブルシューティング

### `OAUTH_SERVER_URL is not configured` エラーが出る

**原因**: `OAUTH_SERVER_URL` 環境変数が未設定です。

**対処**: Railway の Variables タブで以下を追加してください。

```
OAUTH_SERVER_URL = https://api.manus.im
```

### `Missing session cookie` がログに大量に出る

**原因**: これは**正常な動作**です。ログインしていないユーザーがページを訪問するたびに出力されます。エラーではありません。

### デプロイが失敗する

**確認事項:**
- Railway の **「Deployments」** タブでエラーログを確認
- `DATABASE_URL` が正しく設定されているか確認
- `NODE_ENV=production` が設定されているか確認
- `PORT` を設定している場合は**削除**してください（Railway が自動設定）

### ログインできない

**確認事項:**
- `VITE_APP_ID`・`OAUTH_SERVER_URL`・`VITE_OAUTH_PORTAL_URL` が正しく設定されているか確認
- Manus 管理UI で Railway のドメインが「Allowed Redirect URLs」に追加されているか確認

### 試合データが表示されない

**確認事項:**
- DB のテーブルが作成されているか確認（第7章の手順を実施したか）
- 手動でデータ更新を実行する（第12章の手順）
- Railway のログで API エラーが出ていないか確認

### 独自ドメインが反映されない

DNS の反映には最大48時間かかります。https://dnschecker.org で `kaigaisoccer.com` の CNAME が Railway のアドレスを向いているか確認してください。

---

*このガイドは 2026年5月時点の情報をもとに作成されています。Railway の料金・仕様は変更される場合があります。最新情報は https://railway.com/pricing を参照してください。*
