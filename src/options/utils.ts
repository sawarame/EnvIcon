import { parseUrlPattern } from "../features/url_parser";
import {
  EnvironmentConfig,
  EnvironmentsValidationResult,
  EnvValidationErrorState,
  LocalizedValidationErrorGroup,
  ValidationErrorItem,
} from "../types";
import { t } from "./i18n";

/** 不備理由メッセージ内に埋め込むパターン文字列の最大表示文字数 */
const MAX_PATTERN_DISPLAY_LENGTH = 80;

/** 3桁・4桁・6桁・8桁の16進数カラーコードを検証する正規表現 */
const HEX_COLOR_REGEX =
  /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * 環境IDとカスタム環境名（または環境設定オブジェクト）から現在の表示言語に応じた環境表示名を解決する関数
 * @param envOrId - 対象の環境設定オブジェクト、または環境識別子 ("prod" | "stg" | "dev" | "custom_*")
 * @param customName - トリム済みのカスタム環境名（envOrId がオブジェクトの場合は省略可能）
 * @returns ローカライズされた環境表示名（未入力時は代替ラベル）
 */
export const resolveEnvDisplayName = (
  envOrId: EnvironmentConfig | string,
  customName?: string
): string => {
  const envId = typeof envOrId === "string" ? envOrId : envOrId.id;
  const name =
    typeof envOrId === "string"
      ? (customName ?? "")
      : (customName ?? envOrId.name ?? "");

  if (envId === "prod") return t("ProductionName");
  if (envId === "stg") return t("StagingName");
  if (envId === "dev") return t("DevelopmentName");
  const trimmed = name.trim();
  return trimmed !== "" ? trimmed : t("unnamedEnvironment");
};

/**
 * 長大なパターン文字列を吹き出し表示用に指定文字数で安全に切り詰める補助関数
 * @param value - 元のパターン入力文字列
 * @param maxLength - 切り詰め上限文字数（デフォルト: 80）
 * @returns 必要に応じて末尾を "..." で省略した文字列
 */
export const truncatePatternForDisplay = (
  value: string,
  maxLength: number = MAX_PATTERN_DISPLAY_LENGTH
): string => {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};

/**
 * 単一の構造化バリデーションエラー項目を現在言語の説明文へ変換する関数
 * @param item - 構造化バリデーションエラー項目
 * @returns ローカライズされた不備理由メッセージ文字列
 */
export const formatValidationErrorReason = (
  item: ValidationErrorItem
): string => {
  const displayPattern = truncatePatternForDisplay(item.patternValue ?? "");

  switch (item.kind) {
    case "empty_name":
      return t("validationEmptyName");
    case "invalid_badge_color":
      return t("validationInvalidBadgeColor");
    case "invalid_badge_outline_color":
      return t("validationInvalidBadgeOutlineColor");
    case "invalid_font_size":
      return t("validationInvalidFontSize");
    case "invalid_url_pattern":
      return t("validationInvalidUrlPattern", { pattern: displayPattern });
    case "invalid_regex_pattern":
      return t("validationInvalidRegexPattern", { pattern: displayPattern });
    case "duplicate_pattern": {
      if (item.isSameEnvDuplicate) {
        return t("validationDuplicateSameEnv", { pattern: displayPattern });
      }
      const targetEnv = resolveEnvDisplayName(
        item.duplicateOfEnvId ?? "",
        item.duplicateOfCustomName ?? ""
      );
      return t("validationDuplicateOtherEnv", {
        pattern: displayPattern,
        targetEnv,
      });
    }
  }
};

/**
 * 構造化エラー項目の配列を画面の環境順・項目順を維持したまま環境単位の表示グループ配列へ変換する関数
 * @param errorItems - 構造化バリデーションエラー項目の配列
 * @returns 環境ごとにまとめられたローカライズ済み不備理由グループの配列
 */
export const buildLocalizedValidationGroups = (
  errorItems: ValidationErrorItem[]
): LocalizedValidationErrorGroup[] => {
  const groupMap = new Map<string, LocalizedValidationErrorGroup>();

  errorItems.forEach((item) => {
    let group = groupMap.get(item.envId);
    if (!group) {
      group = {
        envId: item.envId,
        envDisplayName: resolveEnvDisplayName(item.envId, item.envCustomName),
        reasons: [],
      };
      groupMap.set(item.envId, group);
    }
    group.reasons.push(formatValidationErrorReason(item));
  });

  return Array.from(groupMap.values());
};

/**
 * 通常モードのパターン入力文字列を検証し、正規化済みのURLパターン文字列（hostname[:port][/path]）を返す関数
 * @param input - ユーザーが入力したURLまたはホスト・パス文字列
 * @returns 正規化済みのパターン文字列、無効な入力の場合は null
 */
export const normalizeUrlPattern = (input: string): string | null => {
  const parsed = parseUrlPattern(input);
  return parsed ? parsed.normalized : null;
};

/** 重複パターン判定のために初出パターンの所属環境情報を保持する内部型 */
interface SeenPatternOrigin {
  /** 初出環境の識別子 */
  envId: string;
  /** 初出環境のトリム済みカスタム環境名 */
  envCustomName: string;
}

/**
 * 環境設定配列を先頭から検証し、正規化済み設定データと構造化エラー項目を一括生成する純粋関数
 * @param environments - オプション設定画面で編集中の環境設定配列
 * @returns 保存可否・正規化済み環境配列・入力欄エラー状態マップ・構造化エラー項目配列を含む検証結果
 */
export const validateEnvironments = (
  environments: EnvironmentConfig[]
): EnvironmentsValidationResult => {
  const fieldErrorsByEnv: Record<string, EnvValidationErrorState> = {};
  const errorItems: ValidationErrorItem[] = [];
  const seenPatterns = new Map<string, SeenPatternOrigin>();
  let hasDuplicate = false;

  const normalizedEnvironments = environments.map((env) => {
    const errState: EnvValidationErrorState = {
      invalidName: false,
      invalidBadgeColor: false,
      invalidBadgeOutlineColor: false,
      invalidPageBadgeFontSize: false,
      invalidPatternIndices: [],
    };

    const trimmedName = env.name.trim();

    // 1. 環境名の空欄チェック
    if (trimmedName === "") {
      errState.invalidName = true;
      errorItems.push({
        envId: env.id,
        envCustomName: trimmedName,
        kind: "empty_name",
      });
    }

    // 2. バッジ文字色のHEX形式チェック
    if (env.badgeColor && !HEX_COLOR_REGEX.test(env.badgeColor.trim())) {
      errState.invalidBadgeColor = true;
      errorItems.push({
        envId: env.id,
        envCustomName: trimmedName,
        kind: "invalid_badge_color",
      });
    }

    // 3. バッジフチ色のHEX形式チェック
    if (
      env.badgeOutlineColor &&
      !HEX_COLOR_REGEX.test(env.badgeOutlineColor.trim())
    ) {
      errState.invalidBadgeOutlineColor = true;
      errorItems.push({
        envId: env.id,
        envCustomName: trimmedName,
        kind: "invalid_badge_outline_color",
      });
    }

    // 4. ページ内バッジ有効時における文字サイズの範囲チェック（1〜500）
    if (env.pageBadgeEnabled !== false) {
      if (
        typeof env.pageBadgeFontSize !== "number" ||
        Number.isNaN(env.pageBadgeFontSize) ||
        env.pageBadgeFontSize < 1 ||
        env.pageBadgeFontSize > 500
      ) {
        errState.invalidPageBadgeFontSize = true;
        errorItems.push({
          envId: env.id,
          envCustomName: trimmedName,
          kind: "invalid_font_size",
        });
      }
    }

    // 5. URL・正規表現パターンの検証と正規化
    const processedHostnames: EnvironmentConfig["hostnames"] = [];

    env.hostnames.forEach((hn, rowIndex) => {
      const rawValue = hn.value.trim();
      if (rawValue === "") return;

      let patternKey = "";
      let processedValue = rawValue;
      let isRowInvalid = false;

      if (hn.isRegex) {
        try {
          new RegExp(rawValue);
          patternKey = `regex:${rawValue}`;
        } catch {
          isRowInvalid = true;
          errorItems.push({
            envId: env.id,
            envCustomName: trimmedName,
            kind: "invalid_regex_pattern",
            patternValue: rawValue,
            patternRowIndex: rowIndex,
          });
        }
      } else {
        const normalized = normalizeUrlPattern(rawValue);
        if (!normalized) {
          isRowInvalid = true;
          errorItems.push({
            envId: env.id,
            envCustomName: trimmedName,
            kind: "invalid_url_pattern",
            patternValue: rawValue,
            patternRowIndex: rowIndex,
          });
        } else {
          processedValue = normalized;
          patternKey = `pattern:${normalized}`;
        }
      }

      if (!isRowInvalid && patternKey) {
        const origin = seenPatterns.get(patternKey);
        if (origin) {
          isRowInvalid = true;
          hasDuplicate = true;
          if (origin.envId === env.id) {
            errorItems.push({
              envId: env.id,
              envCustomName: trimmedName,
              kind: "duplicate_pattern",
              patternValue: rawValue,
              patternRowIndex: rowIndex,
              isSameEnvDuplicate: true,
            });
          } else {
            errorItems.push({
              envId: env.id,
              envCustomName: trimmedName,
              kind: "duplicate_pattern",
              patternValue: rawValue,
              patternRowIndex: rowIndex,
              isSameEnvDuplicate: false,
              duplicateOfEnvId: origin.envId,
              duplicateOfCustomName: origin.envCustomName,
            });
          }
        } else {
          seenPatterns.set(patternKey, {
            envId: env.id,
            envCustomName: trimmedName,
          });
        }
      }

      if (isRowInvalid) {
        errState.invalidPatternIndices.push(rowIndex);
      }

      processedHostnames.push({
        value: processedValue,
        isRegex: hn.isRegex,
        enabled: hn.enabled !== false,
      });
    });

    fieldErrorsByEnv[env.id] = errState;

    return {
      ...env,
      name: trimmedName,
      hostnames: processedHostnames,
    };
  });

  return {
    isValid: errorItems.length === 0,
    hasDuplicate,
    normalizedEnvironments,
    fieldErrorsByEnv,
    errorItems,
  };
};
