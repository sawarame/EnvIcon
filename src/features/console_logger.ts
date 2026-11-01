import type { SessionData, SyncData } from "../types";
import { findMatchingEnv, isTemporarilyDisabled } from "./utils";

/**
 * 開発者ツール（コンソール）に現在の環境情報を出力する関数
 * @param syncData - 同期ストレージの設定データ
 * @param sessionData - セッションストレージの一時OFF設定データ
 */
export const initializeConsoleLoggerFeature = (
  syncData: SyncData,
  sessionData: SessionData = {}
): void => {
  const currentHostname = window.location.hostname;
  if (isTemporarilyDisabled(sessionData, currentHostname)) {
    return;
  }

  const env = findMatchingEnv(syncData.environments, currentHostname);

  if (env && env.consoleLogEnabled !== false) {
    const prefix = `[EnvIcon] Current Env: `;
    const outlineColor = env.badgeOutlineColor || "#ffffff";
    const style = `color: ${env.badgeColor}; font-weight: bold; text-shadow: 0 0 2px ${outlineColor};`;
    console.log(`${prefix}%c${env.name}`, style);
  }
};
