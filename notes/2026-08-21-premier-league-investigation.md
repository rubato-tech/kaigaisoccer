# 2026-08-21 本番欧州日程の確認

- 本番URL: https://kaigaisoccer.com/?tab=euro_upcoming
- 2026-08-21 JST時点で画面は「今後14日間」、201試合、13リーグを表示。
- 本番tRPC API `matches.list` は HTTP 200 で欧州日程（euro_league / uefa / cup）データを返却。
- ユーザー申告: 8月23日JSTのブライトン対アストン・ヴィラ、マンチェスター・シティ対ボーンマスが不足している可能性。
- 次: APIレスポンス内のプレミアリーグ全試合とTheSportsDBの2026-2027シーズンのラウンドデータを照合する。
