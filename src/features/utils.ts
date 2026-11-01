import {
  EnvironmentConfig,
  EnvMatchDetail,
  HostnamePattern,
  SessionData,
} from "../types";

/**
 * デフォルトの環境設定（PROD / STG / DEV）を生成して返す関数
 * @returns 初期状態の環境設定オブジェクトの配列
 */
export const createDefaultEnvironments = (): EnvironmentConfig[] => [
  {
    id: "prod",
    name: "Production",
    badgeText: "prod",
    badgeColor: "#ff0000",
    badgeOutlineColor: "#ffffff",
    faviconEnabled: true,
    pageBadgeEnabled: true,
    consoleLogEnabled: true,
    pageBadgePosition: "bottom-right",
    pageBadgeFontSize: 24,
    hostnames: [],
    isDeletable: false,
  },
  {
    id: "stg",
    name: "Staging",
    badgeText: "stg",
    badgeColor: "#0000ff",
    badgeOutlineColor: "#ffffff",
    faviconEnabled: true,
    pageBadgeEnabled: true,
    consoleLogEnabled: true,
    pageBadgePosition: "bottom-right",
    pageBadgeFontSize: 24,
    hostnames: [],
    isDeletable: false,
  },
  {
    id: "dev",
    name: "Development",
    badgeText: "dev",
    badgeColor: "#008000",
    badgeOutlineColor: "#ffffff",
    faviconEnabled: true,
    pageBadgeEnabled: true,
    consoleLogEnabled: true,
    pageBadgePosition: "bottom-right",
    pageBadgeFontSize: 24,
    hostnames: [],
    isDeletable: false,
  },
];

/**
 * 単一のホスト名パターンが現在のホスト名に一致するか判定する関数
 * @param pattern - 判定対象のホスト名文字列またはパターン設定オブジェクト
 * @param currentHostname - 現在アクセスしているサイトのホスト名
 * @returns 一致する場合は true、それ以外は false
 */
export const isPatternMatch = (
  pattern: string | HostnamePattern,
  currentHostname: string
): boolean => {
  const normalizedCurrent = currentHostname.toLowerCase();
  if (typeof pattern === "string") {
    return pattern.toLowerCase() === normalizedCurrent;
  }
  // パターンが無効化されている場合は一致しないものとする
  if (pattern.enabled === false) return false;
  const trimmed = pattern.value.trim();
  if (!trimmed) return false;

  if (pattern.isRegex) {
    try {
      return new RegExp(trimmed).test(currentHostname);
    } catch {
      return false;
    }
  }
  return trimmed.toLowerCase() === normalizedCurrent;
};

/**
 * 現在のホスト名がパターン群のいずれかに一致するか検証する関数
 * @param patterns - ホスト名パターンの配列
 * @param currentHostname - 現在のサイトのホスト名
 * @returns いずれかのパターンに一致する場合は true、それ以外は false
 */
export const isMatch = (
  patterns: (string | HostnamePattern)[] | undefined,
  currentHostname: string
): boolean => {
  if (!patterns || !currentHostname) return false;
  return patterns.some((p) => isPatternMatch(p, currentHostname));
};

/**
 * 現在のホスト名に一致する環境と一致パターンの詳細情報を返す関数
 * @param environments - 環境設定の配列
 * @param currentHostname - 現在のサイトのホスト名
 * @returns 一致した環境の詳細情報、一致しない場合は null
 */
export const findMatchingDetail = (
  environments: EnvironmentConfig[] | undefined,
  currentHostname: string
): EnvMatchDetail | null => {
  if (!environments || !currentHostname) return null;
  for (const env of environments) {
    if (!env.hostnames) continue;
    for (const rawPattern of env.hostnames) {
      if (isPatternMatch(rawPattern, currentHostname)) {
        const normalizedPattern: HostnamePattern =
          typeof rawPattern === "string"
            ? { value: rawPattern, isRegex: false, enabled: true }
            : rawPattern;
        return {
          env,
          pattern: normalizedPattern,
          isRegexMatch: Boolean(normalizedPattern.isRegex),
        };
      }
    }
  }
  return null;
};

/**
 * 現在のホスト名に一致する環境設定を返す関数
 * @param environments - 環境設定の配列
 * @param currentHostname - 現在のサイトのホスト名
 * @returns 一致した環境設定オブジェクト、一致しない場合は null
 */
export const findMatchingEnv = (
  environments: EnvironmentConfig[] | undefined,
  currentHostname: string
): EnvironmentConfig | null => {
  const detail = findMatchingDetail(environments, currentHostname);
  return detail ? detail.env : null;
};

/**
 * 指定されたホスト名が現在一時OFF（全体OFFまたはサイト単位OFF）になっているか判定する関数
 * @param sessionData - セッションストレージに保存された一時OFFデータ
 * @param currentHostname - 判定対象のホスト名
 * @returns 一時OFFが有効な場合は true、それ以外は false
 */
export const isTemporarilyDisabled = (
  sessionData: SessionData | undefined,
  currentHostname: string
): boolean => {
  if (!sessionData) return false;
  if (sessionData.globalDisabled === true) return true;
  if (!currentHostname || !Array.isArray(sessionData.disabledHostnames)) {
    return false;
  }
  const normalized = currentHostname.toLowerCase();
  return sessionData.disabledHostnames.some(
    (h) => h.toLowerCase() === normalized
  );
};

/**
 * タブのURL文字列から拡張機能が動作可能なホスト名を抽出する関数
 * http / https 以外のスキームや Chrome ウェブストア等の制限ページは対象外（null）とする
 * @param urlStr - 検査対象のURL文字列
 * @returns 動作対象となる小文字のホスト名、対象外の場合は null
 */
export const extractSupportedHostname = (
  urlStr: string | undefined
): string | null => {
  if (!urlStr) return null;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname) return null;
    // Chrome の制限によりコンテンツスクリプトが動作しないストアページを除外
    if (
      hostname === "chromewebstore.google.com" ||
      (hostname === "chrome.google.com" &&
        parsed.pathname.startsWith("/webstore"))
    ) {
      return null;
    }
    return hostname;
  } catch {
    return null;
  }
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
