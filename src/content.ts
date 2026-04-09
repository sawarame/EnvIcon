import type { SyncData } from "./types";
import { initializeFaviconChangerFeature } from "./features/favicon_changer";
import { initializePageBadgeFeature } from "./features/page_badge_changer";

export const init = () => {
  chrome.storage.sync.get(
    null,
    (syncData: SyncData) => {
      // faviconを環境によって書き換える（環境ごとのON/OFFはfeature内で判定）
      initializeFaviconChangerFeature(syncData);

      // ページ内バッジを表示する（環境ごとのON/OFFはfeature内で判定）
      initializePageBadgeFeature(syncData);
    }
  );
};

init();
