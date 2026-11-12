import { ParsedUrlPattern, TargetLocation } from "../types";

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
 * 文字列または TargetLocation を評価用の TargetLocation へ変換する補助関数
 * @param targetOrUrl - フルURL文字列、ホスト[:ポート][/パス]文字列、または TargetLocation
 * @returns 変換された TargetLocation、変換不可の場合は null
 */
export const resolveTargetLocation = (
  targetOrUrl: string | TargetLocation | null | undefined
): TargetLocation | null => {
  if (!targetOrUrl) return null;
  if (typeof targetOrUrl !== "string") {
    return targetOrUrl;
  }
  return parseTargetLocation(targetOrUrl) ?? parseCheckerLocation(targetOrUrl);
};
