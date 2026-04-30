/**
 * Google Calendar API への直接書き込みフック
 * VITE_GOOGLE_CLIENT_ID が設定されていない場合はフォールバック（gcal URL方式）を使う
 */
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Match } from "../../../drizzle/schema";
import {
  hasUsableGoogleAccessToken,
  requestGoogleAccessToken,
  revokeGoogleAccessToken,
} from "@/lib/googleIdentity";
import {
  insertMatchToGoogleCalendar,
  insertMatchesToGoogleCalendar,
} from "@/lib/googleCalendarDirect";

export function useGoogleCalendar() {
  const [isBusy, setIsBusy] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(hasUsableGoogleAccessToken());

  const isConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const ensureToken = useCallback(async () => {
    const token = await requestGoogleAccessToken(!hasUsableGoogleAccessToken());
    setIsAuthorized(true);
    return token;
  }, []);

  const addMatch = useCallback(
    async (match: Match) => {
      if (!isConfigured) {
        // フォールバック: gcal URL を開く
        const { buildGcalUrl } = await import("@/lib/calendar");
        window.open(buildGcalUrl(match), "_blank");
        toast.success("Googleカレンダーを開きました");
        return true;
      }
      setIsBusy(true);
      try {
        const token = await ensureToken();
        await insertMatchToGoogleCalendar(token, match);
        toast.success(
          `${match.homeTeam} vs ${match.awayTeam} を Google カレンダーへ追加しました。`
        );
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Google カレンダー追加に失敗しました。"
        );
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [ensureToken, isConfigured]
  );

  const addMatches = useCallback(
    async (matches: Match[], label = "観戦予定") => {
      if (matches.length === 0) {
        toast.info("追加対象の試合がありません。");
        return { successCount: 0, failures: [] as Array<{ match: Match; error: string }> };
      }
      if (!isConfigured) {
        // API未設定時はICSダウンロードにフォールバック
        const { buildIcs, downloadIcs } = await import("@/lib/calendar");
        const ics = buildIcs(matches, `${label} - kaigaisoccer.com`);
        downloadIcs("watchlist.ics", ics);
        toast.success(
          `${matches.length} 件の試合を ICS ファイルでダウンロードしました。Google カレンダーにインポートしてください。`
        );
        return { successCount: matches.length, failures: [] };
      }
      setIsBusy(true);
      try {
        const token = await ensureToken();
        const result = await insertMatchesToGoogleCalendar(token, matches);
        if (result.successCount > 0) {
          toast.success(
            `${label}から ${result.successCount} 件を Google カレンダーへ追加しました。`
          );
        }
        if (result.failures.length > 0) {
          toast.warning(
            `${result.failures.length} 件は追加に失敗しました。個別に「Googleで開く」をご利用ください。`
          );
        }
        return result;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Google カレンダー一括追加に失敗しました。"
        );
        return {
          successCount: 0,
          failures: matches.map((match) => ({
            match,
            error: "Google Calendar add failed",
          })),
        };
      } finally {
        setIsBusy(false);
      }
    },
    [ensureToken, isConfigured]
  );

  const revoke = useCallback(async () => {
    setIsBusy(true);
    try {
      await revokeGoogleAccessToken();
      setIsAuthorized(false);
      toast.success("Google カレンダー連携を解除しました。次回追加時に再認証されます。");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Google 連携解除に失敗しました。"
      );
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { isBusy, isAuthorized, isConfigured, addMatch, addMatches, revoke };
}
