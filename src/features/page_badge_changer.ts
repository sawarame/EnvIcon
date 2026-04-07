import { SyncData, EnvironmentConfig, PageBadgePosition } from "../types";
import { findMatchingEnv } from "./utils";

let _syncData: SyncData = {};

const BADGE_ID = "env-icon-page-badge";

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

  const env = findMatchingEnv(_syncData.environments, window.location.hostname);
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
