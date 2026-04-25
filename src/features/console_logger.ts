import type { SyncData } from "../types";
import { findMatchingEnv } from "./utils";

/**
 * 開発者ツール（コンソール）に環境情報を出力する
 */
export const initializeConsoleLoggerFeature = (syncData: SyncData) => {
  const currentHostname = window.location.hostname;
  const env = findMatchingEnv(syncData.environments, currentHostname);

  if (env && env.consoleLogEnabled !== false) {
    const prefix = `[EnvIcon] Current Env: `;
    const style = `color: ${env.badgeColor}; font-weight: bold;`;
    console.log(`${prefix}%c${env.name}`, style);
  }
};
