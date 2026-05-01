# Railway MySQL マイグレーション手順書

このガイドでは、Railway にデプロイした MySQL データベースに対してマイグレーション SQL を実行し、試合データを投入する手順を説明します。

---

## 前提条件

- Railway にアプリがデプロイ済みであること
- Railway のプロジェクトに MySQL サービスが追加済みであること

---

## ステップ 1: Railway の MySQL 接続情報を確認する

1. [Railway ダッシュボード](https://railway.com/dashboard) を開く
2. プロジェクトを選択
3. **MySQL サービス**（データベースのアイコン）をクリック
4. **Variables** タブを開く
5. 以下の変数をメモする

| 変数名 | 説明 |
|---|---|
| `MYSQLHOST` | ホスト名（例: `roundhouse.proxy.rlwy.net`） |
| `MYSQLPORT` | ポート番号（例: `12345`） |
| `MYSQLDATABASE` | データベース名（例: `railway`） |
| `MYSQLUSER` | ユーザー名（例: `root`） |
| `MYSQLPASSWORD` | パスワード |

または **Connect** タブ → **MySQL Client** の接続文字列からも確認できます。

---

## ステップ 2: マイグレーション SQL を実行する

### 方法A: Railway ダッシュボードの Query タブを使う（推奨・最も簡単）

1. Railway ダッシュボードで **MySQL サービス**をクリック
2. **Data** タブ（または **Query** タブ）を開く
3. 以下の SQL を**順番に**コピー＆ペーストして実行する

```sql
-- ① usersテーブル作成
CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
```

```sql
-- ② matchesテーブル作成
CREATE TABLE IF NOT EXISTS `matches` (
  `eventId` varchar(32) NOT NULL,
  `category` enum('euro_league','cup','uefa','national_team') NOT NULL,
  `leagueId` varchar(16) NOT NULL,
  `leagueNameJp` varchar(64) NOT NULL,
  `leagueNameEn` varchar(128) NOT NULL,
  `leagueBadge` text,
  `season` varchar(16),
  `round` varchar(16),
  `homeTeamId` varchar(16),
  `homeTeam` varchar(128) NOT NULL,
  `homeTeamBadge` text,
  `awayTeamId` varchar(16),
  `awayTeam` varchar(128) NOT NULL,
  `awayTeamBadge` text,
  `kickoffUtcMs` bigint NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'scheduled',
  `homeScore` int,
  `awayScore` int,
  `venue` varchar(256),
  `tags` varchar(256),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `matches_eventId` PRIMARY KEY(`eventId`)
);
```

```sql
-- ③ sync_logテーブル作成
CREATE TABLE IF NOT EXISTS `sync_log` (
  `id` int AUTO_INCREMENT NOT NULL,
  `source` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL,
  `fetchedCount` int NOT NULL DEFAULT 0,
  `upsertedCount` int NOT NULL DEFAULT 0,
  `message` text,
  `startedAt` timestamp NOT NULL DEFAULT (now()),
  `finishedAt` timestamp,
  CONSTRAINT `sync_log_id` PRIMARY KEY(`id`)
);
```

```sql
-- ④ インデックス作成
CREATE INDEX IF NOT EXISTS `idx_matches_kickoff` ON `matches` (`kickoffUtcMs`);
CREATE INDEX IF NOT EXISTS `idx_matches_category` ON `matches` (`category`,`kickoffUtcMs`);
CREATE INDEX IF NOT EXISTS `idx_matches_league` ON `matches` (`leagueId`,`kickoffUtcMs`);
```

```sql
-- ⑤ favoritesテーブル作成
CREATE TABLE IF NOT EXISTS `favorites` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `teamName` varchar(128) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
CREATE INDEX IF NOT EXISTS `idx_favorites_user_team` ON `favorites` (`userId`,`teamName`);
```

---

### 方法B: MySQL クライアント（mysql コマンド）を使う

Windows の場合、[MySQL Workbench](https://dev.mysql.com/downloads/workbench/) または PowerShell で接続できます。

**PowerShell（mysql コマンドがインストール済みの場合）:**

```powershell
# 接続情報を変数に設定（Railway の Variables タブから取得）
$host = "roundhouse.proxy.rlwy.net"   # MYSQLHOST の値
$port = "12345"                         # MYSQLPORT の値
$user = "root"                          # MYSQLUSER の値
$pass = "xxxxxxxxxxxxxxxx"              # MYSQLPASSWORD の値
$db   = "railway"                       # MYSQLDATABASE の値

# MySQL に接続
mysql -h $host -P $port -u $user -p$pass $db
```

接続後、上記の SQL を貼り付けて実行してください。

---

### 方法C: MySQL Workbench を使う（GUI で操作）

1. [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) をダウンロード・インストール
2. 「+」ボタンで新しい接続を作成
3. 以下を入力:
   - **Hostname**: `MYSQLHOST` の値
   - **Port**: `MYSQLPORT` の値
   - **Username**: `MYSQLUSER` の値
   - **Password**: `MYSQLPASSWORD` の値（「Store in Vault」をクリックして保存）
4. **Test Connection** で接続確認
5. 接続後、上部メニューの **File → Open SQL Script** から SQL ファイルを開くか、直接貼り付けて実行

---

## ステップ 3: テーブルが作成されたか確認する

Railway の **Data** タブまたは MySQL クライアントで以下を実行:

```sql
SHOW TABLES;
```

以下のテーブルが表示されれば成功です:

```
favorites
matches
sync_log
users
```

---

## ステップ 4: 試合データを投入する

テーブルが作成できたら、アプリから試合データを取得・投入します。

### ブラウザからログインして実行する方法

1. `https://kaigaisoccer.com` にアクセスしてログイン
2. ブラウザの開発者ツール（F12）を開く
3. **Application** タブ → **Cookies** → `https://kaigaisoccer.com` を選択
4. `app_session_id` の値をコピー
5. PowerShell で以下を実行:

```powershell
$cookie = "ここにapp_session_idの値を貼り付け"

Invoke-WebRequest `
  -Uri "https://kaigaisoccer.com/api/scheduled/refresh" `
  -Method POST `
  -Headers @{ "Cookie" = "app_session_id=$cookie" }
```

6. レスポンスに `"ok": true` と `"upsertedCount"` が表示されれば成功
7. `https://kaigaisoccer.com` をリロードすると試合一覧が表示される

> **注意:** データ取得には 2〜5 分かかる場合があります（リーグ数が多いため）。

---

## トラブルシューティング

### `Table 'railway.matches' doesn't exist` エラー

→ ステップ 2 のマイグレーション SQL が未実行です。上記の SQL を実行してください。

### `Access denied for user` エラー

→ Railway の Variables タブで `MYSQLPASSWORD` の値を再確認してください。

### `Can't connect to MySQL server` エラー

→ Railway の MySQL サービスが起動しているか確認してください。また、ホスト名・ポート番号が正しいか確認してください。

### データ投入後も試合が表示されない

→ `sync_log` テーブルを確認してください:

```sql
SELECT * FROM sync_log ORDER BY startedAt DESC LIMIT 5;
```

`status = 'error'` の行があれば、`message` 列にエラー内容が記録されています。

---

## 参考: Railway の DATABASE_URL 形式

Railway が自動注入する `DATABASE_URL` は以下の形式です:

```
mysql://root:パスワード@ホスト名:ポート/railway
```

アプリの環境変数に `DATABASE_URL` が設定されていれば、アプリは自動的にこのデータベースに接続します。
