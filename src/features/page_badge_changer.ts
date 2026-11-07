import { PageBadgePosition, SessionData, SyncData } from "../types";
import { findMatchingEnv, isTemporarilyDisabled } from "./utils";

let _syncData: SyncData = {};
let _sessionData: SessionData = {};

const BADGE_ID = "env-icon-page-badge";

/**
 * バッジの表示位置に対応するCSSスタイルを返す関数
 * @param position - ページ内バッジの表示位置
 * @returns 配置用のCSSスタイルオブジェクト
 */
const getPositionStyle = (
  position: PageBadgePosition
): Partial<CSSStyleDeclaration> => {
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
 * ページ内バッジをDOMから取り除く関数
 * @returns なし
 */
const removeBadge = (): void => {
  const badge = document.getElementById(BADGE_ID);
  if (badge) badge.remove();
};

/**
 * 現在の設定と一時OFF状態に基づいてページ内バッジをDOMに挿入・更新または除去する関数
 * @returns なし
 */
const updatePageBadge = (): void => {
  const currentUrl = window.location.href;

  // 一時OFF（全体OFFまたはサイト単位OFF）の場合はバッジを除去する
  if (isTemporarilyDisabled(_sessionData, currentUrl)) {
    removeBadge();
    return;
  }

  const env = findMatchingEnv(_syncData.environments, currentUrl);

  // 環境が見つからない、またはこの環境でページ内バッジが無効な場合はバッジを除去する
  if (!env || env.pageBadgeEnabled === false || !document.body) {
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
 * ページ内バッジ表示機能を初期化する関数
 * @param syncData - 同期ストレージの設定データ
 * @param sessionData - セッションストレージの一時OFF設定データ
 * @returns なし
 */
export const initializePageBadgeFeature = (
  syncData: SyncData,
  sessionData: SessionData = {}
): void => {
  _syncData = syncData;
  _sessionData = sessionData;
  updatePageBadge();
};

/**
 * 設定変更や一時OFF切り替え時にページ内バッジを即座に再評価する関数
 * @param syncData - 最新の同期ストレージ設定データ
 * @param sessionData - 最新のセッションストレージ一時OFF設定データ
 * @returns なし
 */
export const refreshPageBadgeFeature = (
  syncData: SyncData,
  sessionData: SessionData
): void => {
  _syncData = syncData;
  _sessionData = sessionData;
  updatePageBadge();
};
