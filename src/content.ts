import type { SyncData } from "./types";
import { initializeFaviconChangerFeature } from "./features/favicon_changer";
import { initializePageBadgeFeature } from "./features/page_badge_changer";

export const init = () => {
  chrome.storage.sync.get(
    null,
    (syncData: SyncData) => {
      // faviconを環境によって書き換える
      if (
        typeof syncData.faviconEnabled === "undefined" ||
        syncData.faviconEnabled
      ) {
        initializeFaviconChangerFeature(syncData);
      }

      // ページ内バッジを表示する
      initializePageBadgeFeature(syncData);
    }
  );
};

init();
