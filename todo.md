# 海外サッカー日程サイト TODO

## 基盤
- [x] DBスキーマ作成（matches, sync_logテーブル）
- [x] マイグレーションSQL生成・適用
- [x] db.ts に試合取得ヘルパー実装（カテゴリ別フィルタ・upcoming/past）
- [x] tRPC ルーター実装（matches.list / matches.refresh）

## データ取得
- [x] TheSportsDB クライアント実装（eventsround.php ベース）
- [x] 主要欧州リーグ（プレミア/リーガ/セリエA/ブンデス/リーグアン/エールディビジ/ポルトガル/スコットランド/ベルギー/トルコ/スイス/オーストリア）対応 — 12リーグ計約3,300試合
- [x] UEFA大会（CL/EL/ECL）対応 — 計432試合
- [x] 代表戦（W杯予選/EURO/UEFAネーションズ/親善）対応 — 計294試合
- [x] 日本人選手保有チームの試合抽出ロジック（タグ自動付与）— 535試合
- [x] UTC→JST変換、深夜25時/26時/27時表記対応

## フロントエンド
- [x] グローバルテーマ・タイポグラフィ設定（深緑×アイボリー、Noto Serif JP×Noto Sans JP×JetBrains Mono）
- [x] ヘッダー・タブナビ（欧州日程/欧州結果/日本人選手出場試合/代表戦日程）
- [x] 日付グループ表（年月日（曜）ヘッダー＋試合行、JST 04:00未満は前日扱い）
- [x] リーグバッジ・チームエンブレム表示・スタジアム名
- [x] レスポンシブ対応（リーグ列はsm以上で表示）
- [x] ローディング/エラー/空状態（再試行ボタン付きエラーパネルを含む）

## 自動更新
- [x] /api/scheduled/refresh エンドポイント（全リーグ）
- [x] /api/scheduled/refresh-league エンドポイント（個別）
- [x] 初期データ投入完了
- [x] 429レート制限のリトライ（指数バックオフ）
- [x] 毎日自動同期スケジュール（改修フェーズ3で登録済み：毎週火曜5:00 JSTに自動更新）

## 外部サーバー移行・広告収益化（2026-04-27）
- [x] Dockerfile（マルチステージビルド）作成
- [x] docker-compose.yml（MySQL+アプリ）作成
- [x] railway.json（Railway デプロイ設定）作成
- [x] render.yaml（Render デプロイ設定）作成
- [x] env-template.txt（環境変数テンプレート）作成
- [x] AdBannerコンポーネント作成（横長/レクタングル/インフィード）
- [x] Home.tsxにヘッダー下・フッター上の広告スロット追加
- [x] MatchScheduleTableに3日ごとのインフィード広告スロット追加
- [x] index.htmlにAdSenseスクリプトのコメントアウト済みプレースホルダー追加
- [x] EXTERNAL_DEPLOY_GUIDE.md（外部サーバー移行・広告収益化手順書）作成

## 仕上げ
- [x] vitestテスト追加（JST変換・25時表記・データ取得API）— 全12テスト合格
- [x] 動作確認（4タブ全て表示、深夜表記、結果スコア表示）
- [x] チェックポイント保存

## 改修フェーズ2（ユーザー要望）
- [x] レイアウト崩れの修正（テーブル→カード型リスト、モバイル/狭幅でも各列が見やすく収まる）
- [x] 各試合行にリーグ名を必ず表示（モバイルでも省略しない）
- [x] チーム名のカタカナ表記マッピング作成（338チーム）
- [x] リーグ名のカタカナ表記をショート名→正式名へマッピング（CL/EL/ECL・リーグアン等）
- [x] リーグでフィルタリングできるUI（複数選択チップ）
- [x] チーム名で検索フィルタ（原語・カタカナ両対応部分一致）
- [x] フィルタ状態のリセットボタン
- [x] vitestテスト更新（カタカナ化・フィルタ13件追加） — 全 25 テスト合格
- [x] 動作確認（検索とリーグチップ住位表示を確認済）
- [x] チェックポイント保存（4b68b718）
- [x] 無料公開手順をPUBLISH_GUIDE.mdにまとめてユーザーに提供

## 改修フェーズ3（SEO対応）
- [x] index.htmlのtitleを 30～60文字に拡張（56文字）
- [x] description / keywords / OGP / canonical メタタグ追加
- [x] 全img要素にalt属性付与（ホーム/アウェーエンブレムにカタカナチーム名付き）
- [x] vitest 全 25 テスト合格確認
- [x] チェックポイント保存（005408bf）- [x] チェックポイント保存（f4849ea8）
- [x] スケジュールタスク登録（毎日 20:00 UTC = 翌日 5:00 JSTに自動更新、Cookie認証対応済）
## 改修フェーズ4（モバイルタブ修正）
- [x] スマホ幅でタブが重なる問題を修正（shadcn TabsListを廃止し、横スクロール対応のアンダーラインタブに置き換え）
- [x] チェックポイント保存（ff506cf2）・公開済

## 改修フェーズ5（5大リーグ絞り込み＋各国カップ戦追加）
- [x] 各国カップ戦のTheSportsDB IDを調査（FAカップ=4482・コパ・デル・レイ=4483・コッパ・イタリア=4506・DFBポカール=4485・クープ・ド・フランス=4484）
- [x] leagues.ts を5大リーグ＋UEFA3大会＋各国カップ5大会に更新
- [x] 不要リーグ（エールディビジ・ポルトガル・ベルギー・トルコ・スコットランド・スイス・オーストリア）のDBデータを削除（1,774件）
- [x] カップ戦データをTheSportsDB eventsround.phpで取得・DB同期（FAカップ157件・コパ・デル・レイ86件・コッパ・イタリア36件・DFBポカール54件・クープ・ド・フランス97件）
- [x] カップ戦チーム名のカタカナマッピング追加（重複キー14件を修正済み）
- [x] テスト更新・動作確認・チェックポイント保存（25件全合格・カップ戦表示確認済み）

## 大規模拡張フェーズ（2026-04-30）

### リーグ拡張
- [x] leagues.tsにスコットランド(4330)/オランダ(4337)/ベルギー(4338)/ポルトガル(4344)を追加
- [x] leagues.tsにタサ・デ・ポルトガル(4510)カップ戦を追加
- [x] JAPANESE_PLAYER_TEAMSを新リーグ対応クラブに更新
- [x] LEAGUE_DISPLAY_JPに新リーグ名追加

### DBスキーマ拡張
- [x] favoritesテーブル（ユーザーお気に入りチーム）をschema.tsに追加
- [x] マイグレーションSQL生成・適用Ｈ0003_chemical_jack_power.sql）

### お気に入りチーム機能
- [x] お気に入りチーム設定UI（FavoriteTeamsコンポーネント）実装
- [x] お気に入りチームの試合のみ表示するタブをHome.tsxに追加
- [x] favorites tRPCルーター（CRUD）実装

### Googleカレンダー連携
- [x] 個別試合をGoogleカレンダーに追加するボタン実装（MatchScheduleTable）
- [x] お気に入りチームの全試合をiCalフィードでエクスポート（/api/ical/:userId）
- [x] FavoriteTeamsコンポーネントにGoogleカレンダー一括追加ボタン実装

### 追加推奨機能
- [x] プライバシーポリシーページ（/privacy）作成（AdSense審査必須）
- [x] お問い合わせページ（/contact）作成（AdSense審査必須）
- [x] App.tsxにルート追加（/privacy・/contact）

### 外部運用・収益化
- [x] EXTERNAL_DEPLOY_GUIDE.mdをkaigaisoccer.com対応版に完全更新
- [x] Railway/VPSデプロイ手順・自動更新・収益ロードマップを記載

## 全部いいとこ取りブラッシュアップ（2026-05-01）

### 他AIコンポーネント移植
- [x] WeeklyPlanner.tsx 作成（観戦予定リスト・一括ICSダウンロード・カレンダー追加）
- [x] MonetizationSection.tsx 作成（アフィリエイト４渠・環境変数連動）
- [x] lib/monetization.ts 作成（VITE_AFFILIATE_*環境変数でURL管理）
- [x] lib/storage.ts 作成（WATCHLIST_KEY・ FAVORITE_TEAMS_KEY）
- [x] hooks/useGoogleCalendar.ts 作成（API/URL自動切替フック）
- [x] lib/googleIdentity.ts 作成（Google OAuth PKCEフロー）
- [x] lib/googleCalendarDirect.ts 作成（Calendar API v3直接書き込み）
- [x] lib/calendar.ts 作成（gcal URL生成・ICSビルド・ダウンロード）
- [x] Home.tsxにWeeklyPlanner・ MonetizationSection・AdSenseBlockを統合

### SEO対策強化
- [x] index.htmlをOGP・Twitter Card・JSON-LD・canonical完全版に更新（kaigaisoccer.com対応）
- [x] client/public/sitemap.xml 作成（kaigaisoccer.com対応）
- [x] client/public/robots.txt 作成（Sitemap参照・API除外）

### 収益化強化
- [x] AdSenseBlock.tsx 作成（VITE_ADSENSE_CLIENT/SLOT環境変数連動）
- [x] Home.tsxにAdSenseBlockをヘッダー下・フッター上に配置
- [x] VITE_AFFILIATE_*・VITE_GOOGLE_CLIENT_ID・VITE_ADSENSE_*環境変数の手順書をEXTERNAL_DEPLOY_GUIDE.mdに記載済み

## 日本人選手所属リーグ拡張（2026-05-01）

- [x] 2025-26シーズンの日本人選手所属リーグを調査（Wikipedia・ブラウザ経由）
- [x] 現在未対応リーグのTheSportsDB IDを確認（トルコ=4339・スイス=4675・オーストリア=4621・デンマーク=4340・ノルウェー=4358・スウェーデン=4347・ポーランド=4422・ギリシャ=4336・チェコ=4631・セルビア=4671・クロアチア=4629・ルーマニア=4691・フィンランド=4636）
- [x] leagues.tsに13リーグを追加（トルコ・スイス・オーストリア・デンマーク・ノルウェー・スウェーデン・ポーランド・ギリシャ・チェコ・セルビア・クロアチア・ルーマニア・フィンランド）
- [x] JAPANESE_PLAYER_TEAMSを新リーグ対応クラブで更新
- [x] LEAGUE_DISPLAY_JPに13リーグ名を追加
- [x] 新リーグのデータ取得は次回のCron実行時に自動取得（毎週火曜5:00 JST）
- [x] チーム名カタカナマッピングは既存teamNames.tsに包含済み
- [x] テスト全25件合格・チェックポイント保存（30d42c14）

## 無料運用切替＋リーグ追加（2026-05-01）

- [x] スイス・スーパーリーグ（ID: 4675・追加済み）
- [x] デンマーク・スーパーリーガ（ID: 4340・追加済み）
- [x] オーストリア・ブンデスリーガ（ID: 4621・追加済み）
- [x] ポーランド・エクストラクラサ（ID: 4422・追加済み）
- [x] スウェーデン・アルスヴェンスカン（ID: 4347・追加済み）
- [x] ギリシャ・スーパーリーグ（ID: 4336・追加済み）
- [x] チェコ・フォルトゥナリーガ（ID: 4631・追加済み）
- [x] セルビア・スーパーリーガ（ID: 4671・追加済み）
- [x] クロアチアHNL（ID: 4629）・ルーマニアリーガ1（ID: 4691）・フィンランド（ID: 4636）・ノルウェー（ID: 4358）・トルコ（ID: 4339）も追加済み
- [x] JAPANESE_PLAYER_TEAMS を新リーグ対応クラブで更新済み
- [x] LEAGUE_DISPLAY_JP に13リーグ名を追加済み
- [x] EXTERNAL_DEPLOY_GUIDE.md をCloudflare完全無料運用版に全面書き直し（Railway・VPS・有料サービスの記述を全削除）
- [x] テスト全25件合格・チェックポイント保存（30d42c14）

## 不要リーグ削除（2026-05-01）

- [x] leagues.tsからノルウェー・スウェーデン・ポーランド・ギリシャ・チェコ・セルビア・クロアチア・ルーマニア・フィンランド・スイス・オーストリア・デンマークの12リーグを削除
- [x] teamNames.tsのLEAGUE_DISPLAY_JPから同12リーグのエントリを削除
- [x] TSエラー確認・テスト実行（25件全合格）

## EFLカップ追加（2026-05-01）

- [x] leagues.tsにEFLカップ（カラバオカップ ID:4570）を追加
- [x] teamNames.tsのLEAGUE_DISPLAY_JPにEFLカップを追加
- [x] leagues.tsにチャンピオンシップ（イングランド2部 ID:4329）を追加
- [x] teamNames.tsのLEAGUE_DISPLAY_JPにチャンピオンシップを追加
- [x] TSエラー確認・テスト実行・チェックポイント保存

## 新機能追加（2026-05-01）

- [x] 試合結果ハイライトリンク（試合終了後にYouTube検索リンクを表示）
- [x] 時差表示切り替え（JST↔現地時間トグル）
- [x] 順位表（スキップ）

## 日本人選手タブ充実（2026-05-01）

- [x] 新規追加リーグの日本人選手所属クラブ調査（オランダ・ベルギー・ポルトガル・トルコ・スコットランド・チャンピオンシップ）
- [x] teamNames.tsのJAPANESE_PLAYER_TEAMSを更新
- [x] テスト実行・チェックポイント保存

## 時差表示ボタン改善（2026-05-01）

- [x] 時差表示切り替えボタンの配置・デザインを改善（分かりやすく目立つUIに）

## 完全ガイド作成（2026-05-01）

- [x] COMPLETE_GUIDE.md を最新状態で作り直し（PowerShellコマンド・AdSense・アフィリエイト・移行手順）

## Railway 移行手順書（2026-05-01）

- [x] RAILWAY_DEPLOY_GUIDE.md を作成（PowerShellコマンド付き・全手順詳細）

## Railwayデプロイエラー修正（2026-05-01）

- [x] patches/wouter@3.7.1.patchファイルの欠落を修正（DockerfileのStage1・Stage2に`COPY patches/ ./patches/`を追加）
- [x] GitHubにプッシュしてRailway再デプロイ確認（vite.tsとindex.tsを動的インポートに変更してvite.configがビルドに含まれない修正）

## RAILWAY_DEPLOY_GUIDE.md 詳細化（2026-05-01）

- [x] PORT設定が不要であることを明記（Railwayが自動割り当て）
- [x] OAUTH_SERVER_URLエラーの原因と対処をトラブルシューティングに追加
- [x] Missing session cookieが正常動作であることを明記
- [x] VITE_APP_IDの取得方法をスクリーンショット付きで詳細化
- [x] OWNER_OPEN_IDの取得方法を詳細化
- [x] OAUTH_SERVER_URL・VITE_OAUTH_PORTAL_URLが固定値であることを明記
- [x] AdSenseスロットIDの取得手順をステップバイステップで記載
- [x] アフィリエイト各サービスの申請手順を詳細化
- [x] VITE_GOOGLE_CLIENT_IDの取得手順をGoogle Cloud Console操作含めて詳細化
- [x] 全変数の設定チェックリストを追加（必須/推奨/任意の3段階）

## SEO修正（2026-05-01）

- [x] Home.tsxのuseEffectでdocument.titleをタブ切替時に動的設定（30～60文字）
- [x] index.htmlのdescriptionを180文字→ 88文字に短縮（50～160文字内）
- [x] index.htmlのkeywordsを 25個→ 7個に削減（3～8個推奨内）
- [x] TSErrorなし・テスト25件全合格

## Railwayヘルスチェック修正（2026-05-01）

- [x] server/_core/index.tsにシンプルな GET /health ルートを追加（tRPCより前に配置）
- [x] railway.jsonのhealthcheckPathを/api/trpc/healthから/healthに修正
- [x] TSエラーなし・テスト25件全合格

## 試合数不足問題の修正（2026-05-02）

- [x] Railway DBのブンデスリーガデータ件数を確認
- [x] TheSportsDB APIから正しくデータが取得できているか確認
- [x] 取得期間・フィルタリングロジックの問題を特定
- [x] データ再取得して本番に反映

## 全25リーグ取得件数不足の修正（2026-05-02）

- [x] 全25リーグのnext/past取得件数を調査（TheSportsDB APIの制限確認）
- [x] syncMatches.tsのラウンド推定ロジックを改善（next件数が少ない場合の対処）
- [x] sportsDb.tsのfetchCurrentRound()でR0（ラウンド未設定の無効値）を除外
- [x] syncMatches.tsのカップ戦処理でR0を「nextなし」と同じ扱いに修正
- [x] Railway DBに全25リーグのデータを再取得して投入（合計1012件）
- [x] テスト実行（25件全合格）・チェックポイント保存（48139713）

## GitHub Actions ワークフロー更新（2026-05-02）

- [x] .github/workflows/refresh-matches.ymlを全25リーグ対応版に更新（スクリーンショットの旧版を置き換え）
- [x] スケジュールを6時間毎（6:00/12:00/18:00/0:00 JST）に設定
- [x] league_idリストを現在の25リーグ（チャンピオンシップ/EFLカップ/スコットランド/オランダ/ベルギー/ポルトガル/トルコ/タサ等）に更新
- [x] チェックポイント保存・GitHubへプッシュ

## GitHub Actions 502/タイムアウトエラー修正（2026-05-02）

- [x] /api/scheduled/refresh-leagueを202即時返却＋バックグラウンド処理に変更（CloudRunの60秒タイムアウト回避）
- [x] leagueIdをreq.bodyから取得するよう修正（旧版はreq.query.idのみ）
- [x] GitHub Actionsのcurlを--max-time 30・--retry 3に変更
- [x] HTTP 200/202両方を成功とみなすよう修正
- [x] 全リーグ完了後にsync-log-finishを呼ぶfinishジョブを追加（sleep 120でバックグラウンド処理完了を待機）

## タブ状態の保持機能（2026-05-03）

- [x] URLクエリパラメータ（?tab=xxxx）でタブを制御（URLシェア・ブックマーク対応）
- [x] LocalStorageにタブの最終選択値を保存（再訪問時に復元）
- [x] 優先順位：URLパラメータ > LocalStorage > デフォルト（最初のタブ）
- [x] ブラウザの「戻る」ボタンでタブ履歴を正しく扱う

## OGP/メタタグとリーグフィルタURL対応（2026-05-03）

- [x] OGP/メタタグをタブに応じて動的に変更（og:title, og:description, og:url）
- [x] リーグフィルタをURLクエリパラメータ（?league=4331）で制御
- [x] ?tab=xxx&league=xxxx の組み合わせでブックマーク・シェア可能にする
- [x] LocalStorageにリーグフィルタの最終選択値も保存

## 欧州日程タブの全カテゴリ統合（2026-05-20）

- [x] 欧州日程タブ（euro_upcoming）にCL・EL・カンファレンスリーグ（UEFA）と各国カップ戦（cup）を統合
- [x] 欧州結果タブ（euro_past）も同様に全カテゴリ一括表示に変更
- [x] カップ戦タブ（cup_upcoming）を廃止（欧州日程タブに統合済みのため不要）
- [x] db.tsのMatchListParamsを複数カテゴリ（配列）対応に拡張
- [x] routers.tsのcategoryEnumを配列対応に更新
- [x] Home.tsxのVIEWS定義を複数カテゴリ配列に変更・includeUefa廃止
- [x] OGP/メタタグのtitles/ogDescriptionsからcup_upcomingエントリを削除
- [x] テスト25件全合格

## UEFA決勝データ未取得・sync-log更新バグ修正（2026-05-20）

- [x] syncMatches.ts: isSpecialRound閾値を>=100から>=160に変更（R125=QF/R150=SFを「シーズン終了」と誤判定しないよう修正）
- [x] sync-log-finish: isNull条件ではなく最新レコードのIDを直接指定して必ずfinishedAtを更新するよう修正
- [x] テスト25件全合格

## GitHub Actions 直接DB書き込み方式への移行（2026-05-22）

- [x] Railwayデプロイログを分析（429レート制限が大量発生・並列処理が原因）
- [x] scripts/sync-direct.ts を新規作成（サーバー経由なしで直接RailwayのMySQLに書き込む）
- [x] リーグを1つずつ順番に処理（並列なし → 429レート制限を回避）
- [x] .github/workflows/refresh-matches.yml を直接DB書き込み方式に全面更新（pnpm対応）
- [ ] GitHub SecretsにDATABASE_URLを追加（ユーザー作業）
- [ ] GitHubに新しいワークフローをプッシュ（ユーザー作業）
- [ ] GitHub Actionsで手動実行して動作確認（ユーザー作業）

## ワールドカップ2026データ取得・表示機能追加（2026-05-22）

- [x] TheSportsDB APIでWC2026のシーズン・ラウンド構造を調査（s=2026, R1〜R3=グループステージ各24試合）
- [x] shared/leagues.tsにworld_cupカテゴリを追加・WC2026エントリ（id:4429, fixedSeason:"2026"）を追加
- [x] drizzle/schema.tsのcategoryカラムにworld_cupを追加（マイグレーション適用済み）
- [x] server/syncMatches.tsでworld_cupカテゴリをeuro_leagueと同様のラウンドベース取得に対応・fixedSeasonを使用
- [x] server/db.tsのMatchCategory型にworld_cupを追加
- [x] server/routers.tsのsingleCategoryEnumにworld_cupを追加
- [x] client/src/pages/Home.tsxに「W杯2026」タブを追加（worldcup_upcoming）
- [x] チェックポイント保存（ead8eed6）
- [ ] GitHub Actionsで再実行してWC2026データを取得（ユーザー作業）
