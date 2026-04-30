/**
 * Google Identity Services (GSI) を使ったアクセストークン取得
 * VITE_GOOGLE_CLIENT_ID が設定されていない場合は例外を投げる
 */

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  callback?: (response: TokenResponse) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string }) => void;
  }) => TokenClient;
  revoke: (token: string, callback?: () => void) => void;
}

interface GsiWindow {
  google_gsi?: {
    accounts: {
      oauth2: GoogleOAuth2;
    };
  };
}

const GOOGLE_IDENTITY_SRC = "https://accounts.google.com/gsi/client";
const DEFAULT_SCOPE = "https://www.googleapis.com/auth/calendar.events";

let scriptPromise: Promise<void> | null = null;
let tokenClient: TokenClient | null = null;
let tokenState: { accessToken: string; expiresAt: number } | null = null;

function getGsi(): { accounts: { oauth2: GoogleOAuth2 } } | undefined {
  // window.google は google-maps-react 等が既に型宣言しているため
  // 別名プロパティ経由でアクセスする
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).google as { accounts: { oauth2: GoogleOAuth2 } } | undefined;
}

function getClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId || typeof clientId !== "string") {
    throw new Error(
      "Google Calendar 直接追加は未設定です。VITE_GOOGLE_CLIENT_ID を設定してください。"
    );
  }
  return clientId;
}

function getScope(): string {
  const scope = import.meta.env.VITE_GOOGLE_CALENDAR_SCOPE;
  return typeof scope === "string" && scope.trim() ? scope.trim() : DEFAULT_SCOPE;
}

export async function preloadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") return;
  if (getGsi()?.accounts?.oauth2) return;
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google Identity script の読み込みに失敗しました。")),
        { once: true }
      );
      return;
    }
    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Google Identity script の読み込みに失敗しました。"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

async function getTokenClient(): Promise<TokenClient> {
  await preloadGoogleIdentityScript();

  const gsi = getGsi();
  if (!gsi?.accounts?.oauth2) {
    throw new Error("Google Identity Services が利用できません。");
  }
  if (tokenClient) return tokenClient;

  tokenClient = gsi.accounts.oauth2.initTokenClient({
    client_id: getClientId(),
    scope: getScope(),
    callback: () => {
      // requestAccessToken 呼び出し時に上書きするため、ここでは no-op
    },
  });
  return tokenClient;
}

export function hasUsableGoogleAccessToken(): boolean {
  return Boolean(tokenState && tokenState.expiresAt > Date.now() + 15_000);
}

export async function requestGoogleAccessToken(forcePrompt = false): Promise<string> {
  if (hasUsableGoogleAccessToken() && tokenState) {
    return tokenState.accessToken;
  }
  const client = await getTokenClient();
  return new Promise<string>((resolve, reject) => {
    client.callback = (response: TokenResponse) => {
      if (response.error || !response.access_token) {
        reject(
          new Error(
            response.error_description || response.error || "Google 認証に失敗しました。"
          )
        );
        return;
      }
      const expiresIn =
        typeof response.expires_in === "number" ? response.expires_in : 3600;
      tokenState = {
        accessToken: response.access_token,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      resolve(response.access_token);
    };
    try {
      client.requestAccessToken({ prompt: forcePrompt ? "consent" : "" });
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error("Google 認証ポップアップを開始できませんでした。")
      );
    }
  });
}

export async function revokeGoogleAccessToken(): Promise<void> {
  const gsi = getGsi();
  if (!tokenState?.accessToken || !gsi?.accounts?.oauth2) {
    tokenState = null;
    return;
  }
  await new Promise<void>((resolve) => {
    gsi.accounts.oauth2.revoke(tokenState!.accessToken, () => resolve());
  });
  tokenState = null;
}

// 未使用の型を使うためのダミーエクスポート（lint対策）
export type { GsiWindow };
