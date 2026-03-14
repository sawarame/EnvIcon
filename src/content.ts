import type { SyncData } from "./types";
import { initializeFaviconChangerFeature } from "./features/favicon_changer";

export const init = () => {
  chrome.storage.sync.get(
    ["faviconEnabled", "prodHostnames", "stgHostnames", "devHostnames"],
    (syncData: SyncData) => {
      // faviconを環境によって書き換える
      if (
        typeof syncData.faviconEnabled === "undefined" ||
        syncData.faviconEnabled
      ) {
        initializeFaviconChangerFeature(
          syncData.prodHostnames || [],
          syncData.stgHostnames || [],
          syncData.devHostnames || []
        );
      }
    }
  );
};

init();
