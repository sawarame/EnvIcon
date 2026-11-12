import {
  EnvironmentConfig,
  EnvMatchDetail,
  HostnamePattern,
  MatchSpecificity,
  TargetLocation,
} from "../types";
import { parseUrlPattern, resolveTargetLocation } from "./url_parser";

/**
 * パターン1件を評価した結果の内部中間データ型
 */
export interface PatternEvaluationResult {
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
 * 単一のパターン定義を対象ロケーションに対して評価し、一致時に詳細度情報を返す関数
 * @param rawPattern - 評価対象のパターン定義
 * @param target - 対象ページのロケーション情報
 * @param envIndex - 環境配列内のインデックス
 * @param patternIndex - パターン配列内のインデックス
 * @returns 一致した場合は評価結果オブジェクト、不一致の場合は null
 */
export const evaluateSinglePattern = (
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
export const isHigherSpecificity = (
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
