import type { SyncData } from "./types";
import { initializeFaviconChangerFeature } from "./features/favicon_changer";

export const init = () => {
  chrome.storage.sync.get(
    ["faviconEnabled", "prodHostname", "stgHostname", "devHostname"],
    (syncData: SyncData) => {
      // faviconを環境によって書き換える
      if (
        typeof syncData.faviconEnabled === "undefined" ||
        syncData.faviconEnabled
      ) {
        initializeFaviconChangerFeature(
          syncData.prodHostname,
          syncData.stgHostname,
          syncData.devHostname
        );
      }
    }
  );
};

init();
