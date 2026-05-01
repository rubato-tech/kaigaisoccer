# GitHub Actions による試合データ自動更新 手順書

このガイドでは、GitHub Actions を使って `https://kaigaisoccer.com` の試合データを定期的に自動更新する設定方法を説明します。

---

## 全体の仕組み

```
GitHub Actions（定期実行）
    ↓ POST /api/scheduled/refresh
kaigaisoccer.com（Railway）
    ↓ TheSportsDB API からデータ取得
Railway MySQL（試合データ更新）
    ↓
サイトに最新データが表示される
```

---

## 必要なもの

- GitHub アカウント（このプロジェクトのリポジトリにアクセスできること）
- `https://kaigaisoccer.com` にログインできること（Cookie の取得に必要）

---

## ステップ1: Cookie を取得する

GitHub Actions がサイトの API を呼び出すには、認証 Cookie が必要です。

### 1-1. サイトにログインする

ブラウザで以下の URL を開いてログインしてください:

```
https://manus.im/oauth/authorize?client_id=RaqPabotonJ74A6GpXWVTN&redirect_uri=https://kaigaisoccer.com/api/oauth/callback&response_type=code&state=https://kaigaisoccer.com
```

ログイン後、`https://kaigaisoccer.com` にリダイレクトされます。

### 1-2. Cookie の値をコピーする

1. ブラウザで `https://kaigaisoccer.com` を開いた状態で **F12** キーを押す
2. **Application** タブ（Chrome）または **ストレージ** タブ（Firefox）を開く
3. 左側の **Cookies** → `https://kaigaisoccer.com` をクリック
4. 一覧から **`app_session_id`** を探す
5. **Value** 列の値を**全部コピー**する（`eyJ...` で始まる長い文字列）

> **注意:** この Cookie は1年間有効です。期限が切れたら再度取得して GitHub Secrets を更新してください。

---

## ステップ2: GitHub Secrets を設定する

GitHub Actions が使う認証情報を GitHub の Secrets（秘密変数）に登録します。

### 2-1. GitHub リポジトリを開く

1. [https://github.com](https://github.com) を開く
2. このプロジェクトのリポジトリ（`kaigaisoccer` または `soccer_schedule_jp`）を開く

### 2-2. Secrets の設定画面を開く

1. リポジトリのページ上部の **Settings**（設定）タブをクリック
2. 左側メニューの **Secrets and variables** → **Actions** をクリック
3. **New repository secret** ボタンをクリック

### 2-3. 1つ目の Secret を追加: `SITE_URL`

| 項目 | 値 |
|---|---|
| **Name** | `SITE_URL` |
| **Secret** | `https://kaigaisoccer.com` |

**Add secret** ボタンをクリックして保存。

### 2-4. 2つ目の Secret を追加: `SCHEDULED_TASK_COOKIE`

| 項目 | 値 |
|---|---|
| **Name** | `SCHEDULED_TASK_COOKIE` |
| **Secret** | ステップ1でコピーした `app_session_id` の値 |

**Add secret** ボタンをクリックして保存。

---

## ステップ3: ワークフローファイルを確認する

このプロジェクトには既に `.github/workflows/refresh-matches.yml` が含まれています。
**実行スケジュール（日本時間）:**

| 実行時刻 | 用途 |
|---|---|
| 毎日 6:00 | 当日の試合データを取得 |
| 毎日 12:00 | 午後の試合データを更新 |
| 毎日 18:00 | 夜の試合データを更新 |
| 毎日 23:00 | 習日のデータを先取り |

**実行方式:**

全 25 リーグ・大会を最大3並列で実行します。各リーグのタイムアウトは 2 分なので、Cloudflare の 10 分タイムアウトを回避できます。

---

## ステップ4: 手動で動作確認する

設定が正しいか、手動でワークフローを実行して確認します。

1. GitHub リポジトリの **Actions** タブを開く
2. 左側の **試合データ自動更新** をクリック
3. 右側の **Run workflow** ボタンをクリック
4. **Run workflow** を押して実行

実行が完了（緑のチェックマーク）になれば成功です。

---

## ステップ5: 実行結果を確認する

### GitHub Actions のログで確認

1. Actions タブ → 実行済みのワークフローをクリック
2. **refresh** ジョブをクリック
3. **試合データ取得エンドポイントを呼び出す** のステップを展開

成功時のログ例:
```
試合データ更新を開始します...
HTTPステータス: 200
レスポンス: {"ok":true,"upsertedCount":1234,"fetchedCount":1500}
試合データ更新が完了しました
```

### サイトで確認

`https://kaigaisoccer.com` をリロードして試合一覧が表示されれば成功です。

---

## トラブルシューティング

### `HTTP 403` エラーが出る

Cookie の値が間違っているか期限切れです。

**対処法:**
1. ブラウザで再度ログインして Cookie を取得
2. GitHub Secrets の `SCHEDULED_TASK_COOKIE` を更新

### `HTTP 500` エラーが出る

サーバー側でエラーが発生しています。

**対処法:**
Railway ダッシュボード → kaigaisoccer サービス → **Logs** タブでエラー内容を確認してください。

### ワークフローが表示されない

`.github/workflows/refresh-matches.yml` が GitHub にプッシュされていない可能性があります。

**対処法:**
このプロジェクトを GitHub にプッシュ（または Manus の Publish）してから再確認してください。

### スケジュールが実行されない

GitHub Actions のスケジュール実行は、**リポジトリにアクティビティがない場合、60日後に自動停止**されます。

**対処法:**
定期的にコードを更新するか、Actions タブから手動実行してアクティビティを維持してください。

---

## スケジュールの変更方法

`.github/workflows/refresh-matches.yml` の `cron:` 行を編集します。

**cron の書き方（UTC 基準）:**

```
分 時 日 月 曜日
```

**よく使うパターン（JST = UTC+9）:**

| やりたいこと | cron（UTC） |
|---|---|
| 毎日 JST 6:00 | `0 21 * * *`（前日UTC） |
| 毎日 JST 12:00 | `0 3 * * *` |
| 毎日 JST 18:00 | `0 9 * * *` |
| 毎日 JST 23:00 | `0 14 * * *` |
| 毎時 0分 | `0 * * * *` |
| 6時間ごと | `0 */6 * * *` |

---

## 参考: 手動でデータ投入する方法

GitHub Actions を使わずに手動でデータを投入したい場合は、PowerShell で以下を実行してください:

```powershell
$cookie = "app_session_idの値をここに貼り付け"

Invoke-WebRequest `
  -Uri "https://kaigaisoccer.com/api/scheduled/refresh" `
  -Method POST `
  -Headers @{ "Cookie" = "app_session_id=$cookie" } `
  -TimeoutSec 600
```
