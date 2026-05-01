# ============================================================
# Stage 1: Build
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# pnpm をインストール
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# 依存関係ファイルとパッチをコピー
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# 本番依存 + 開発依存を全てインストール（ビルドに必要）
RUN pnpm install --frozen-lockfile

# ソースコードをコピー
COPY . .

# フロントエンド + サーバーをビルド
RUN pnpm run build

# ============================================================
# Stage 2: Production
# ============================================================
FROM node:22-alpine AS production

WORKDIR /app

# pnpm をインストール
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# 依存関係ファイルとパッチをコピー（pnpm installがpatchesを必要とするため先にコピー）
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# 本番依存のみインストール
RUN pnpm install --frozen-lockfile --prod

# ビルド成果物をコピー
COPY --from=builder /app/dist ./dist

# drizzle スキーマ・マイグレーション（起動時に参照される場合に備えて）
COPY --from=builder /app/drizzle ./drizzle

# shared（実行時に参照される場合）
COPY --from=builder /app/shared ./shared

# 環境変数のデフォルト値
ENV NODE_ENV=production
ENV PORT=8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/api/trpc/health 2>/dev/null || exit 1

EXPOSE 8080

CMD ["node", "dist/index.js"]
