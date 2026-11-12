import { SessionData, TargetLocation } from "../types";
import { parseTargetLocation } from "./url_parser";

/**
 * 指定されたURLまたはホスト識別子が現在一時OFF（全体OFFまたはサイト単位OFF）になっているか判定する関数
 * サイト単位の一時OFFは hostWithPort（hostname[:port]）単位で評価する
 * @param sessionData - セッションストレージに保存された一時OFFデータ
 * @param targetOrUrl - 判定対象のフルURL文字列、hostWithPort 文字列、または TargetLocation
 * @returns 一時OFFが有効な場合は true、それ以外は false
 */
export const isTemporarilyDisabled = (
  sessionData: SessionData | undefined,
  targetOrUrl: string | TargetLocation | null | undefined
): boolean => {
  if (!sessionData) return false;
  if (sessionData.globalDisabled === true) return true;
  if (!targetOrUrl || !Array.isArray(sessionData.disabledHostnames)) {
    return false;
  }

  let normalizedHostKey = "";
  if (typeof targetOrUrl !== "string") {
    normalizedHostKey = targetOrUrl.hostWithPort.toLowerCase();
  } else {
    const parsedLocation = parseTargetLocation(targetOrUrl);
    normalizedHostKey = parsedLocation
      ? parsedLocation.hostWithPort.toLowerCase()
      : targetOrUrl.trim().toLowerCase();
  }

  if (!normalizedHostKey) return false;
  return sessionData.disabledHostnames.some(
    (h) => h.toLowerCase() === normalizedHostKey
  );
};

/**
 * chrome.storage.session から一時OFF設定を安全に取得する非同期関数
 * @returns セッションデータのオブジェクト
 */
export const getSessionData = async (): Promise<SessionData> => {
  try {
    if (!chrome.storage?.session) {
      return {};
    }
    const data = await chrome.storage.session.get([
      "globalDisabled",
      "disabledHostnames",
    ]);
    return {
      globalDisabled: Boolean(data.globalDisabled),
      disabledHostnames: Array.isArray(data.disabledHostnames)
        ? (data.disabledHostnames as string[])
        : [],
    };
  } catch {
    return {};
  }
};
