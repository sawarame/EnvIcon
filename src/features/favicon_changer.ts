import { SyncData, EnvironmentConfig } from "../types";
import { findMatchingEnv } from "./utils";

let _syncData: SyncData = {};
let _lastGeneratedFaviconHref = "";
let _lastSourceHref = ""; // 最後に生成に使用した元のFaviconのURL
let _lastMatchKey = ""; // 最後に生成に使用したバッジ設定のハッシュ的な文字列
let _lastAttemptFailed = false; // 前回の生成がフォールバック（白背景）だったかどうか
let _isUpdating = false;
let _currentRequestId = 0;

const GENERATED_ID = "env-icon-generated";
const DISABLED_REL = "envicon-disabled-link";

/**
 * 対象の link 要素が favicon 関連かどうかを判定する
 */
const isFaviconLink = (link: HTMLLinkElement): boolean => {
  if (link.id === GENERATED_ID) return false;
  const rel = (link.rel || "").toLowerCase();
  // もともと favicon だったもの、または現在 favicon であるもの
  const isFav = rel.includes("icon") || rel.includes("shortcut");
  const wasFav = !!link.dataset.originalRel;
  return isFav || wasFav;
};

/**
 * 全てのファビコン関連のlink要素を取得する。
 */
const getExternalFavicons = (): HTMLLinkElement[] => {
  return Array.from(document.querySelectorAll<HTMLLinkElement>("link")).filter(isFaviconLink);
};

/**
 * 新しいファビコン要素を作成・または更新する。
 */
const updateFavicon = async () => {
  if (_isUpdating) return;
  _isUpdating = true;

  const requestId = ++_currentRequestId;

  try {
    const env = findMatchingEnv(_syncData.environments, window.location.hostname);

    if (!env || env.faviconEnabled === false) {
      const existing = document.getElementById(GENERATED_ID);
      if (existing) existing.remove();
      _lastGeneratedFaviconHref = "";
      _lastSourceHref = "";
      _lastMatchKey = "";
      _lastAttemptFailed = false;
      return;
    }

    const match = {
      text: env.badgeText || env.id,
      color: env.badgeColor || "#888888",
      outlineColor: env.badgeOutlineColor || "#ffffff",
    };
    const currentMatchKey = JSON.stringify(match);

    const externalFavicons = getExternalFavicons();
    
    let currentSourceHref = "";
    if (externalFavicons.length > 0) {
      // 最後に定義されたものを優先（多くのサイトが最後に上書きするため）
      currentSourceHref = externalFavicons[externalFavicons.length - 1].href;
    } else {
      // DOMにない場合はブラウザが認識しているもの、またはデフォルト
      const tabInfo = await new Promise<any>(resolve => {
        chrome.runtime.sendMessage({ type: "GET_TAB_INFO" }, resolve);
      });
      if (tabInfo?.favIconUrl) {
        currentSourceHref = tabInfo.favIconUrl;
      } else {
        currentSourceHref = new URL("/favicon.ico", window.location.href).href;
      }
    }

    const absoluteSourceHref = new URL(currentSourceHref, window.location.href).href;

    // キャッシュチェック: 
    // ソースURLもバッジ設定も変わっておらず、かつ前回成功している場合は既存のものを使う
    if (_lastGeneratedFaviconHref && absoluteSourceHref === _lastSourceHref && currentMatchKey === _lastMatchKey && !_lastAttemptFailed) {
      // 既存の外部faviconを無効化（動的に追加されたものがあれば）
      externalFavicons.forEach(fav => {
        if (fav.rel !== DISABLED_REL) {
          if (!fav.dataset.originalRel) fav.dataset.originalRel = fav.rel;
          fav.rel = DISABLED_REL;
          fav.disabled = true;
        }
      });

      let ourFav = document.getElementById(GENERATED_ID) as HTMLLinkElement | null;
      if (!ourFav || document.head.lastElementChild !== ourFav || ourFav.href !== _lastGeneratedFaviconHref) {
        if (!ourFav) {
          ourFav = document.createElement("link");
          ourFav.id = GENERATED_ID;
          ourFav.rel = "icon";
        }
        ourFav.href = _lastGeneratedFaviconHref;
        document.head.appendChild(ourFav);
      }
      return;
    }

    _lastSourceHref = absoluteSourceHref;
    _lastMatchKey = currentMatchKey;

    // 他のfaviconを無効化
    externalFavicons.forEach(fav => {
      if (fav.rel === DISABLED_REL) return;
      if (!fav.dataset.originalRel) fav.dataset.originalRel = fav.rel;
      fav.rel = DISABLED_REL;
      fav.disabled = true;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    const drawAndApply = () => {
      // 古いリクエストの結果なら無視
      if (requestId !== _currentRequestId) return;

      const isFailed = img.width === 0;
      _lastAttemptFailed = isFailed;

      // 読み込み失敗時は前回の成功分があれば維持、なければ白背景で続行
      if (isFailed && _lastGeneratedFaviconHref && !_lastAttemptFailed) {
        return;
      }

      const size = Math.max(img.width || 32, 32);
      canvas.width = size;
      canvas.height = size;
      
      if (img.width > 0) {
        ctx.drawImage(img, 0, 0, size, size);
      } else {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, size, size);
      }

      const { text, color, outlineColor } = match;
      const fontSize = Math.max(Math.round(size / 2.5), 12);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = Math.max(size / 10, 2);
      ctx.lineJoin = "round";
      ctx.strokeText(text, size / 2, size - 2);

      ctx.fillStyle = color;
      ctx.fillText(text, size / 2, size - 2);

      const newHref = canvas.toDataURL("image/png");
      _lastGeneratedFaviconHref = newHref;

      let newFav = document.getElementById(GENERATED_ID) as HTMLLinkElement;
      if (!newFav) {
        newFav = document.createElement("link");
        newFav.id = GENERATED_ID;
        newFav.rel = "icon";
      }
      newFav.href = newHref;
      document.head.appendChild(newFav); // 常に末尾に移動
    };

    img.onload = drawAndApply;
    img.onerror = drawAndApply;

    chrome.runtime.sendMessage({ type: "FETCH_IMAGE", url: absoluteSourceHref }, (response) => {
      if (requestId !== _currentRequestId) return;
      if (response && response.dataUrl) {
        img.src = response.dataUrl;
      } else {
        img.src = absoluteSourceHref;
      }
    });
  } finally {
    _isUpdating = false;
  }
};

const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
  let shouldUpdate = false;
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      const addedNodes = Array.from(mutation.addedNodes);
      const removedNodes = Array.from(mutation.removedNodes);
      if (addedNodes.some(node => node instanceof HTMLLinkElement && isFaviconLink(node))) {
        shouldUpdate = true;
        break;
      }
      if (removedNodes.some(node => node instanceof HTMLElement && node.id === GENERATED_ID)) {
        shouldUpdate = true;
        break;
      }
    } else if (mutation.type === "attributes") {
      const target = mutation.target as HTMLLinkElement;
      if (target instanceof HTMLLinkElement && isFaviconLink(target)) {
        shouldUpdate = true;
        break;
      }
    }
  }
  if (shouldUpdate) {
    updateFavicon();
  }
});

export const initializeFaviconChangerFeature = (syncData: SyncData) => {
  _syncData = syncData;
  updateFavicon();

  const target = document.querySelector("head");
  if (target) {
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "rel"]
    });
  }

  setInterval(updateFavicon, 3000);
};
