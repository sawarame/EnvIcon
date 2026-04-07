import { EnvironmentConfig, HostnamePattern } from "../types";

/**
 * 現在のホスト名がパターン群のいずれかに一致するか検証する。
 */
export const isMatch = (
  patterns: (string | HostnamePattern)[] | undefined,
  currentHostname: string
): boolean => {
  if (!patterns) return false;
  return patterns.some((p) => {
    if (typeof p === "string") return p === currentHostname;
    if (p.isRegex) {
      try {
        return new RegExp(p.value).test(currentHostname);
      } catch {
        return false;
      }
    }
    return p.value === currentHostname;
  });
};

/**
 * 現在のホスト名に一致する環境設定を返す。
 */
export const findMatchingEnv = (
  environments: EnvironmentConfig[] | undefined,
  currentHostname: string
): EnvironmentConfig | null => {
  if (!environments) return null;
  for (const env of environments) {
    if (isMatch(env.hostnames, currentHostname)) {
      return env;
    }
  }
  return null;
};
