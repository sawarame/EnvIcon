import { SyncData, HostnamePattern, EnvironmentConfig, PageBadgePosition } from "../types";

let _syncData: SyncData = {};

const BADGE_ID = "env-icon-page-badge";

/**
 * 現在のホスト名がパターン群のいずれかに一致するか検証する。
 */
const isMatch = (
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
const findMatchingEnv = (currentHostname: string): EnvironmentConfig | null => {
  if (!_syncData.environments) return null;
  for (const env of _syncData.environments) {
    if (isMatch(env.hostnames, currentHostname)) {
      return env;
    }
  }
  return null;
};

/**
 * バッジの表示位置に対応するCSSスタイルを返す。
 */
const getPositionStyle = (position: PageBadgePosition): Partial<CSSStyleDeclaration> => {
  const base: Partial<CSSStyleDeclaration> = {
    position: "fixed",
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto",
    margin: "12px",
  };
  switch (position) {
    case "top-left":
      return { ...base, top: "0", left: "0" };
    case "top-right":
      return { ...base, top: "0", right: "0" };
    case "bottom-left":
      return { ...base, bottom: "0", left: "0" };
    case "bottom-right":
    default:
      return { ...base, bottom: "0", right: "0" };
  }
};

/**
 * ページ内バッジをDOMに挿入・更新する。
 */
const updatePageBadge = () => {
  // バッジが無効な場合、既存のバッジを取り除いて終了する
  if (!_syncData.pageBadgeEnabled) {
    removeBadge();
    return;
  }

  const env = findMatchingEnv(window.location.hostname);
  if (!env) {
    removeBadge();
    return;
  }

  const position: PageBadgePosition = env.pageBadgePosition || "bottom-right";
  const fontSize = env.pageBadgeFontSize || 24;
  const text = env.badgeText || env.id;
  const color = env.badgeColor || "#888888";

  let badge = document.getElementById(BADGE_ID) as HTMLElement | null;
  if (!badge) {
    badge = document.createElement("div");
    badge.id = BADGE_ID;
    document.body.appendChild(badge);
  }

  // スタイルのリセット後、必要なスタイルを適用する
  badge.removeAttribute("style");

  const posStyle = getPositionStyle(position);
  Object.assign(badge.style, {
    ...posStyle,
    zIndex: "2147483647",
    fontSize: `${fontSize}px`,
    fontWeight: "bold",
    color: color,
    opacity: "0.5",
    pointerEvents: "none",
    userSelect: "none",
    fontFamily: "sans-serif",
    lineHeight: "1",
    whiteSpace: "nowrap",
    textShadow: `0 0 4px ${env.badgeOutlineColor || "#ffffff"}`,
  });

  badge.textContent = text.toUpperCase();
};

/**
 * ページ内バッジをDOMから取り除く。
 */
const removeBadge = () => {
  const badge = document.getElementById(BADGE_ID);
  if (badge) badge.remove();
};

export const initializePageBadgeFeature = (syncData: SyncData) => {
  _syncData = syncData;
  updatePageBadge();
};
