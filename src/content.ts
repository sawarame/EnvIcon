import type { SessionData, SyncData } from "./types";
import {
  initializeFaviconChangerFeature,
  refreshFaviconChangerFeature,
} from "./features/favicon_changer";
import {
  initializePageBadgeFeature,
  refreshPageBadgeFeature,
} from "./features/page_badge_changer";
import {
  initializeConsoleLoggerFeature,
  refreshConsoleLoggerFeature,
} from "./features/console_logger";
import { initializeUrlObserverFeature } from "./features/url_observer";
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
 * 現在の設定・一時OFF状態・ロケーションに基づいてページ上の全機能を一括再評価する関数
 * @returns なし
 */
const refreshAllFeatures = (): void => {
  refreshFaviconChangerFeature(currentSyncData, currentSessionData);
  refreshPageBadgeFeature(currentSyncData, currentSessionData);
  refreshConsoleLoggerFeature(currentSyncData, currentSessionData);
};

/**
 * ストレージ変更イベントを受け取り、ページ上の表示をリアルタイムで更新する非同期関数
 * @param changes - 変更されたキーと値のマップ
 * @param areaName - 変更が発生したストレージ領域名
 * @returns 更新処理完了を表す Promise
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

  refreshAllFeatures();
};

/**
 * コンテンツスクリプトの初期化、画面内URL遷移監視、およびストレージ監視を開始する非同期関数
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

  // SPA 等の画面内URLパス遷移を検知してリロードなしで表示を再評価する
  initializeUrlObserverFeature(() => {
    refreshAllFeatures();
  });

  // ポップアップや設定画面での変更をリロードなしで即時反映する
  chrome.storage.onChanged.addListener((changes, areaName) => {
    void handleStorageChange(changes, areaName);
  });
};

void init();
