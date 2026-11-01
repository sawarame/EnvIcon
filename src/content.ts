import type { SessionData, SyncData } from "./types";
import {
  initializeFaviconChangerFeature,
  refreshFaviconChangerFeature,
} from "./features/favicon_changer";
import {
  initializePageBadgeFeature,
  refreshPageBadgeFeature,
} from "./features/page_badge_changer";
import { initializeConsoleLoggerFeature } from "./features/console_logger";
import { getSessionData } from "./features/utils";

let currentSyncData: SyncData = {};
let currentSessionData: SessionData = {};

/**
 * 同期ストレージから全環境設定を取得する非同期関数
 * @returns 同期ストレージの設定データ
 */
const loadSyncData = async (): Promise<SyncData> => {
  const data = await chrome.storage.sync.get(null);
  return data as SyncData;
};

/**
 * ストレージ変更イベントを受け取り、ページ上の表示をリアルタイムで更新する関数
 * @param changes - 変更されたキーと値のマップ
 * @param areaName - 変更が発生したストレージ領域名
 */
const handleStorageChange = async (
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
): Promise<void> => {
  if (areaName !== "sync" && areaName !== "session") {
    return;
  }

  if (areaName === "sync" && changes.environments) {
    currentSyncData = await loadSyncData();
  }
  if (
    areaName === "session" &&
    (changes.globalDisabled || changes.disabledHostnames)
  ) {
    currentSessionData = await getSessionData();
  }

  refreshFaviconChangerFeature(currentSyncData, currentSessionData);
  refreshPageBadgeFeature(currentSyncData, currentSessionData);
};

/**
 * コンテンツスクリプトの初期化およびストレージ監視を開始する非同期関数
 * @returns 初期化完了を表す Promise
 */
export const init = async (): Promise<void> => {
  const [syncData, sessionData] = await Promise.all([
    loadSyncData(),
    getSessionData(),
  ]);

  currentSyncData = syncData;
  currentSessionData = sessionData;

  // favicon を環境設定および一時OFF状態に応じて書き換える
  initializeFaviconChangerFeature(currentSyncData, currentSessionData);

  // ページ内バッジを表示する
  initializePageBadgeFeature(currentSyncData, currentSessionData);

  // コンソールに環境名を表示する
  initializeConsoleLoggerFeature(currentSyncData, currentSessionData);

  // ポップアップや設定画面での変更をリロードなしで即時反映する
  chrome.storage.onChanged.addListener((changes, areaName) => {
    void handleStorageChange(changes, areaName);
  });
};

void init();
