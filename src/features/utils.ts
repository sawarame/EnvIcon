import {
  EnvironmentConfig,
  EnvMatchDetail,
  HostnamePattern,
  MatchSpecificity,
  ParsedUrlPattern,
  SessionData,
  TargetLocation,
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
 * 小文字化済みのホスト名文字列が有効なドメイン・IPv4・IPv6構文であるか検証する関数
 * @param hostname - 検証対象の小文字ホスト名
 * @returns 有効なホスト名構文である場合は true、それ以外は false
 */
export const isValidHostnameSyntax = (hostname: string): boolean => {
  if (!hostname) return false;
  // IPv6 ブラケット表記の検証
  if (/^\[[a-f0-9:]+\]$/.test(hostname)) {
    return true;
  }
  // ドメイン名および IPv4 の基本文字種・先頭末尾・連続ドット検証
  if (
    !/^[a-z0-9.-]+$/.test(hostname) ||
    /^[.-]|[.-]$/.test(hostname) ||
    hostname.includes("..")
  ) {
    return false;
  }
  // 各ラベルの先頭・末尾ハイフンを禁止する
  return hostname
    .split(".")
    .every(
      (label) =>
        label.length > 0 && !label.startsWith("-") && !label.endsWith("-")
    );
};

/**
 * 通常モードのURLパターン入力文字列を構造化解析・検証・正規化する関数
 * 受け入れ形式: [http:// | https://]hostname[:port][/path][?query][#hash]
 * @param input - ユーザーが入力したパターン文字列
 * @returns 正規化済みの構造化パターン情報、無効な入力の場合は null
 */
export const parseUrlPattern = (input: string): ParsedUrlPattern | null => {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;

  // スキームの検査（指定されている場合は http / https のみ許可）
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//.exec(text);
  let explicitScheme: "http" | "https" | null = null;
  let remainder = text;

  if (schemeMatch) {
    const lowerScheme = schemeMatch[1].toLowerCase();
    if (lowerScheme !== "http" && lowerScheme !== "https") {
      return null;
    }
    explicitScheme = lowerScheme;
    remainder = text.slice(schemeMatch[0].length);
  }

  // クエリパラメータとハッシュフラグメントを除外する
  const withoutQueryHash = remainder.split(/[?#]/)[0];
  if (!withoutQueryHash) return null;

  // ホスト[:ポート] 部分とパス部分に分割する
  const slashIndex = withoutQueryHash.indexOf("/");
  const authority =
    slashIndex === -1 ? withoutQueryHash : withoutQueryHash.slice(0, slashIndex);
  const rawPath = slashIndex === -1 ? "" : withoutQueryHash.slice(slashIndex);

  if (!authority || authority.includes("@")) return null;

  // IPv6 と通常ホストを区別してホスト部とポート部を分離する
  let rawHost = "";
  let rawPort: string | null = null;

  if (authority.startsWith("[")) {
    const closeBracketIndex = authority.indexOf("]");
    if (closeBracketIndex === -1) return null;
    rawHost = authority.slice(0, closeBracketIndex + 1);
    const portSuffix = authority.slice(closeBracketIndex + 1);
    if (portSuffix === "") {
      rawPort = null;
    } else if (portSuffix.startsWith(":")) {
      rawPort = portSuffix.slice(1);
      if (!rawPort) return null;
    } else {
      return null;
    }
  } else {
    if (authority.includes("[") || authority.includes("]")) return null;
    const parts = authority.split(":");
    if (parts.length > 2) return null;
    rawHost = parts[0];
    rawPort = parts.length === 2 ? parts[1] : null;
    if (!rawHost || (rawPort !== null && rawPort === "")) return null;
    // 単一の数値のみの入力（例: "8080"）が IPv4 整数表記へ誤変換されるのを防ぐ
    if (/^[0-9]+$/.test(rawHost)) return null;
  }

  // ポート番号の数値範囲検証（1〜65535）および明示スキーム時の標準ポート省略正規化
  let normalizedPort = "";
  if (rawPort !== null) {
    if (!/^[0-9]+$/.test(rawPort)) return null;
    const portNum = Number(rawPort);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      return null;
    }
    if (
      (explicitScheme === "http" && portNum === 80) ||
      (explicitScheme === "https" && portNum === 443)
    ) {
      normalizedPort = "";
    } else {
      normalizedPort = String(portNum);
    }
  }

  // URL パーサーによるホスト名正規化（小文字化・Punycode変換・IPv6正規化）と構文チェック
  let hostname = "";
  try {
    const parsedHostUrl = new URL(`http://${rawHost}`);
    if (
      !parsedHostUrl.hostname ||
      parsedHostUrl.pathname !== "/" ||
      parsedHostUrl.username ||
      parsedHostUrl.password ||
      parsedHostUrl.port
    ) {
      return null;
    }
    hostname = parsedHostUrl.hostname.toLowerCase();
  } catch {
    return null;
  }

  if (!isValidHostnameSyntax(hostname)) return null;

  // パス部分の正規化（大文字・小文字は維持し、末尾スラッシュを除去。トップ "/" のみは空文字扱い）
  let normalizedPath = "";
  let pathSegmentCount = 0;
  if (rawPath && rawPath !== "/") {
    const trimmedPath = rawPath.replace(/\/+$/, "");
    if (trimmedPath && trimmedPath !== "/") {
      normalizedPath = trimmedPath;
      pathSegmentCount = trimmedPath.split("/").filter(Boolean).length;
    }
  }

  const hostPart = normalizedPort ? `${hostname}:${normalizedPort}` : hostname;
  const normalized = `${hostPart}${normalizedPath}`;

  return {
    normalized,
    hostname,
    port: normalizedPort,
    path: normalizedPath,
    pathSegmentCount,
  };
};

/**
 * タブのURL文字列から拡張機能が動作可能な評価対象ロケーション情報を抽出する関数
 * http / https 以外のスキームや Chrome ウェブストア等の制限ページは対象外（null）とする
 * @param urlStr - 検査対象のフルURL文字列
 * @returns 抽出された TargetLocation オブジェクト、対象外の場合は null
 */
export const parseTargetLocation = (
  urlStr: string | undefined
): TargetLocation | null => {
  if (!urlStr) return null;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || !isValidHostnameSyntax(hostname)) return null;

    // Chrome の制限によりコンテンツスクリプトが動作しないストアページを除外
    if (
      hostname === "chromewebstore.google.com" ||
      (hostname === "chrome.google.com" &&
        parsed.pathname.startsWith("/webstore"))
    ) {
      return null;
    }

    const port = parsed.port;
    const effectivePort = port || (parsed.protocol === "https:" ? "443" : "80");
    const hostWithPort = port ? `${hostname}:${port}` : hostname;
    const pathname = parsed.pathname || "/";
    const normalizedPath =
      pathname === "/" ? "" : pathname.replace(/\/+$/, "");
    const hostAndPath = `${hostWithPort}${pathname}`;

    return {
      hostname,
      port,
      effectivePort,
      hostWithPort,
      pathname,
      normalizedPath,
      hostAndPath,
    };
  } catch {
    return null;
  }
};

/**
 * URLチェッカー等のユーザー入力文字列（スキーム省略可）から TargetLocation を生成する関数
 * @param inputStr - 検証用のURLまたはホスト・パス文字列
 * @returns 抽出された TargetLocation オブジェクト、不正な入力の場合は null
 */
export const parseCheckerLocation = (
  inputStr: string | undefined
): TargetLocation | null => {
  if (!inputStr) return null;
  const trimmed = inputStr.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
  if (!hasScheme) {
    // 単一数値（ポート番号のみ等）が IPv4 と誤認されるのを防ぐ
    const authority = trimmed.split(/[/?#]/)[0];
    const hostCandidate = authority.startsWith("[")
      ? authority
      : authority.split(":")[0];
    if (/^[0-9]+$/.test(hostCandidate)) return null;
  }

  const candidateUrl = hasScheme ? trimmed : `http://${trimmed}`;
  return parseTargetLocation(candidateUrl);
};

/**
 * タブのURL文字列から拡張機能が動作可能なホスト識別子（hostname[:port]）を抽出する関数
 * @param urlStr - 検査対象のURL文字列
 * @returns 動作対象となる小文字の hostWithPort、対象外の場合は null
 */
export const extractSupportedHostname = (
  urlStr: string | undefined
): string | null => {
  const location = parseTargetLocation(urlStr);
  return location ? location.hostWithPort : null;
};

/**
 * 文字列または TargetLocation を評価用の TargetLocation へ変換する内部補助関数
 * @param targetOrUrl - フルURL文字列、ホスト[:ポート][/パス]文字列、または TargetLocation
 * @returns 変換された TargetLocation、変換不可の場合は null
 */
const resolveTargetLocation = (
  targetOrUrl: string | TargetLocation | null | undefined
): TargetLocation | null => {
  if (!targetOrUrl) return null;
  if (typeof targetOrUrl !== "string") {
    return targetOrUrl;
  }
  return parseTargetLocation(targetOrUrl) ?? parseCheckerLocation(targetOrUrl);
};

/**
 * パターン1件を評価した結果の内部中間データ型
 */
interface PatternEvaluationResult {
  /** 正規化されたパターンオブジェクト */
  pattern: HostnamePattern;
  /** 正規表現による一致かどうか */
  isRegexMatch: boolean;
  /** 対象ページの hostWithPort と通常パターンで完全一致したかどうか */
  isExactHostPortMatch: boolean;
  /** 優先順位比較用の詳細度ベクトル */
  specificity: MatchSpecificity;
}

/**
 * 単一のパターン定義を対象ロケーションに対して評価し、一致時に詳細度情報を返す内部関数
 * @param rawPattern - 評価対象のパターン定義
 * @param target - 対象ページのロケーション情報
 * @param envIndex - 環境配列内のインデックス
 * @param patternIndex - パターン配列内のインデックス
 * @returns 一致した場合は評価結果オブジェクト、不一致の場合は null
 */
const evaluateSinglePattern = (
  rawPattern: string | HostnamePattern,
  target: TargetLocation,
  envIndex: number,
  patternIndex: number
): PatternEvaluationResult | null => {
  const normalizedPattern: HostnamePattern =
    typeof rawPattern === "string"
      ? { value: rawPattern, isRegex: false, enabled: true }
      : rawPattern;

  if (normalizedPattern.enabled === false) return null;
  const trimmed = normalizedPattern.value.trim();
  if (!trimmed) return null;

  // 1. 正規表現モードの評価
  if (normalizedPattern.isRegex) {
    try {
      const regex = new RegExp(trimmed);
      const hasSlash = trimmed.includes("/");
      const hasColon = trimmed.includes(":");
      const hostAndNormalizedPath = `${target.hostWithPort}${target.normalizedPath}`;

      let matched =
        regex.test(target.hostAndPath) || regex.test(hostAndNormalizedPath);

      // パス区切り "/" を含まない正規表現は hostWithPort 単体にも判定を行う
      if (!matched && !hasSlash) {
        matched = regex.test(target.hostWithPort);
      }
      // ":" も "/" も含まない既存のホスト名正規表現は hostname 単体にも後方互換判定を行う
      if (!matched && !hasSlash && !hasColon) {
        matched = regex.test(target.hostname);
      }

      if (!matched) return null;

      const tier: 1 | 2 | 3 = hasSlash ? 3 : hasColon ? 2 : 1;
      return {
        pattern: normalizedPattern,
        isRegexMatch: true,
        isExactHostPortMatch: false,
        specificity: {
          tier,
          isExactRule: 0,
          pathSegmentCount: 0,
          pathLength: 0,
          hasPort: hasColon ? 1 : 0,
          envIndex,
          patternIndex,
        },
      };
    } catch {
      return null;
    }
  }

  // 2. 通常モード（構造化URLパターン）の評価
  const parsed = parseUrlPattern(trimmed);
  if (!parsed) return null;

  // 条件1: ホスト名一致（小文字）
  if (parsed.hostname !== target.hostname) return null;

  // 条件2: ポート一致（未指定なら任意ポート、指定時は非標準ポートまたは実効ポートと一致）
  if (
    parsed.port !== "" &&
    parsed.port !== target.port &&
    parsed.port !== target.effectivePort
  ) {
    return null;
  }

  // 条件3: パス一致（未指定なら全パス、指定時は大文字小文字を区別してセグメント境界で配下一致）
  if (parsed.path !== "") {
    const isExactPath = target.normalizedPath === parsed.path;
    const isSubPath = target.normalizedPath.startsWith(`${parsed.path}/`);
    if (!isExactPath && !isSubPath) {
      return null;
    }
  }

  const tier: 1 | 2 | 3 =
    parsed.path !== "" ? 3 : parsed.port !== "" ? 2 : 1;
  const isExactHostPortMatch =
    parsed.path === "" && parsed.normalized === target.hostWithPort;

  return {
    pattern: {
      ...normalizedPattern,
      value: parsed.normalized,
    },
    isRegexMatch: false,
    isExactHostPortMatch,
    specificity: {
      tier,
      isExactRule: 1,
      pathSegmentCount: parsed.pathSegmentCount,
      pathLength: parsed.path.length,
      hasPort: parsed.port !== "" ? 1 : 0,
      envIndex,
      patternIndex,
    },
  };
};

/**
 * 新しい候補の詳細度が現在の最良候補よりも優先されるかどうかを判定する関数
 * @param candidate - 比較対象の新規候補の詳細度ベクトル
 * @param currentBest - 現在選択されている最良候補の詳細度ベクトル
 * @returns candidate の方が優先度が高い場合は true、それ以外は false
 */
const isHigherSpecificity = (
  candidate: MatchSpecificity,
  currentBest: MatchSpecificity
): boolean => {
  if (candidate.tier !== currentBest.tier) {
    return candidate.tier > currentBest.tier;
  }
  if (candidate.isExactRule !== currentBest.isExactRule) {
    return candidate.isExactRule > currentBest.isExactRule;
  }
  if (candidate.pathSegmentCount !== currentBest.pathSegmentCount) {
    return candidate.pathSegmentCount > currentBest.pathSegmentCount;
  }
  if (candidate.pathLength !== currentBest.pathLength) {
    return candidate.pathLength > currentBest.pathLength;
  }
  if (candidate.hasPort !== currentBest.hasPort) {
    return candidate.hasPort > currentBest.hasPort;
  }
  if (candidate.envIndex !== currentBest.envIndex) {
    return candidate.envIndex < currentBest.envIndex;
  }
  return candidate.patternIndex < currentBest.patternIndex;
};

/**
 * 単一のURLパターンが対象URLまたはロケーションに一致するか判定する関数
 * @param pattern - 判定対象のパターン文字列またはパターン設定オブジェクト
 * @param targetOrUrl - 検査対象のフルURL文字列、ホスト文字列、または TargetLocation
 * @returns 一致する場合は true、それ以外は false
 */
export const isPatternMatch = (
  pattern: string | HostnamePattern,
  targetOrUrl: string | TargetLocation
): boolean => {
  const target = resolveTargetLocation(targetOrUrl);
  if (!target) return false;
  return evaluateSinglePattern(pattern, target, 0, 0) !== null;
};

/**
 * 対象URLまたはロケーションがパターン群のいずれかに一致するか検証する関数
 * @param patterns - パターンの配列
 * @param targetOrUrl - 検査対象のフルURL文字列、ホスト文字列、または TargetLocation
 * @returns いずれかのパターンに一致する場合は true、それ以外は false
 */
export const isMatch = (
  patterns: (string | HostnamePattern)[] | undefined,
  targetOrUrl: string | TargetLocation
): boolean => {
  if (!patterns) return false;
  const target = resolveTargetLocation(targetOrUrl);
  if (!target) return false;
  return patterns.some(
    (p, index) => evaluateSinglePattern(p, target, 0, index) !== null
  );
};

/**
 * 対象URLまたはロケーションに対して詳細度優先ルールを適用し、最優先で一致する環境とパターンの詳細情報を返す関数
 * @param environments - 環境設定の配列
 * @param targetOrUrl - 検査対象のフルURL文字列、ホスト文字列、または TargetLocation
 * @returns 最優先で一致した環境の詳細情報、一致しない場合は null
 */
export const findMatchingDetail = (
  environments: EnvironmentConfig[] | undefined,
  targetOrUrl: string | TargetLocation | null | undefined
): EnvMatchDetail | null => {
  if (!environments) return null;
  const target = resolveTargetLocation(targetOrUrl);
  if (!target) return null;

  let bestDetail: EnvMatchDetail | null = null;
  let bestSpecificity: MatchSpecificity | null = null;

  for (let envIndex = 0; envIndex < environments.length; envIndex++) {
    const env = environments[envIndex];
    if (!env.hostnames) continue;

    for (
      let patternIndex = 0;
      patternIndex < env.hostnames.length;
      patternIndex++
    ) {
      const evaluated = evaluateSinglePattern(
        env.hostnames[patternIndex],
        target,
        envIndex,
        patternIndex
      );
      if (!evaluated) continue;

      if (
        !bestSpecificity ||
        isHigherSpecificity(evaluated.specificity, bestSpecificity)
      ) {
        bestSpecificity = evaluated.specificity;
        bestDetail = {
          env,
          envIndex,
          pattern: evaluated.pattern,
          patternIndex,
          isRegexMatch: evaluated.isRegexMatch,
          isExactHostPortMatch: evaluated.isExactHostPortMatch,
        };
      }
    }
  }

  return bestDetail;
};

/**
 * 対象URLまたはロケーションに対して最優先で一致する環境設定を返す関数
 * @param environments - 環境設定の配列
 * @param targetOrUrl - 検査対象のフルURL文字列、ホスト文字列、または TargetLocation
 * @returns 最優先で一致した環境設定オブジェクト、一致しない場合は null
 */
export const findMatchingEnv = (
  environments: EnvironmentConfig[] | undefined,
  targetOrUrl: string | TargetLocation | null | undefined
): EnvironmentConfig | null => {
  const detail = findMatchingDetail(environments, targetOrUrl);
  return detail ? detail.env : null;
};

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
