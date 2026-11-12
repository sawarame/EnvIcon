import type { SessionData, SyncData } from "../types";
import { findMatchingEnv } from "./matcher";
import { isTemporarilyDisabled } from "./session";

// 直前にコンソール出力した環境の識別子（同一環境内遷移での重複出力防止用）
let _lastLoggedEnvId: string | null = null;

/**
 * 現在のURLと設定状態を評価し、判定結果の環境が変化した場合のみ開発者ツール（コンソール）へ出力する内部関数
 * @param syncData - 同期ストレージの設定データ
 * @param sessionData - セッションストレージの一時OFF設定データ
 * @returns なし
 */
const evaluateAndLogEnvironment = (
  syncData: SyncData,
  sessionData: SessionData
): void => {
  const currentUrl = window.location.href;
  if (isTemporarilyDisabled(sessionData, currentUrl)) {
    _lastLoggedEnvId = null;
    return;
  }

  const env = findMatchingEnv(syncData.environments, currentUrl);
  if (!env || env.consoleLogEnabled === false) {
    _lastLoggedEnvId = null;
    return;
  }

  // 同一環境内のパス遷移や無関係な設定更新時は重複ログを出力しない
  if (env.id === _lastLoggedEnvId) {
    return;
  }

  _lastLoggedEnvId = env.id;
  const prefix = `[EnvIcon] Current Env: `;
  const outlineColor = env.badgeOutlineColor || "#ffffff";
  const style = `color: ${env.badgeColor}; font-weight: bold; text-shadow: 0 0 2px ${outlineColor};`;
  console.log(`${prefix}%c${env.name}`, style);
};

/**
 * コンソールログ出力機能を初期化し、初回読み込み時の環境情報を出力する関数
 * @param syncData - 同期ストレージの設定データ
 * @param sessionData - セッションストレージの一時OFF設定データ
 * @returns なし
 */
export const initializeConsoleLoggerFeature = (
  syncData: SyncData,
  sessionData: SessionData = {}
): void => {
  evaluateAndLogEnvironment(syncData, sessionData);
};

/**
 * 画面内URL遷移またはストレージ変更時にコンソールログ出力状態を再評価する関数
 * @param syncData - 同期ストレージの最新設定データ
 * @param sessionData - セッションストレージの最新一時OFF設定データ
 * @returns なし
 */
export const refreshConsoleLoggerFeature = (
  syncData: SyncData,
  sessionData: SessionData = {}
): void => {
  evaluateAndLogEnvironment(syncData, sessionData);
};
