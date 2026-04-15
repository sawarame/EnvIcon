import { SyncData, EnvironmentConfig } from "../types";
import { findMatchingEnv } from "./utils";

let _syncData: SyncData = {};
let _lastGeneratedFaviconHref = "";
let _lastSourceHref = ""; // 最後に生成に使用した元のFaviconのURL

const FAVICON_SELECTOR = "link[rel*='icon']";

/**
 * 全てのファビコン関連のlink要素を取得する。
 */
const getFavicons = (): HTMLLinkElement[] => {
  return Array.from(document.querySelectorAll<HTMLLinkElement>(FAVICON_SELECTOR));
};

/**
 * 新しいファビコン要素を作成・または更新する。
 */
const updateFavicon = async () => {
  const env = findMatchingEnv(_syncData.environments, window.location.hostname);

  // 環境が見つからない、またはこの環境でFavicon書き換えが無効な場合はリセット
  if (!env || env.faviconEnabled === false) {
    const existing = document.getElementById("env-icon-generated") as HTMLLinkElement | null;
    if (existing) {
      existing.remove();
      _lastGeneratedFaviconHref = "";
      _lastSourceHref = "";
    }
    return;
  }

  const favicons = getFavicons();
  const externalFavicons = favicons.filter(f => f.id !== "env-icon-generated");
  
  // 有効な外部faviconがあるかチェック
  const activeExternalFavicons = externalFavicons.filter(f => !f.disabled && f.rel.toLowerCase().includes("icon"));
  const ourFav = document.getElementById("env-icon-generated") as HTMLLinkElement | null;

  // 元のFaviconのURLを特定（有効なものがあれば優先、なければ無効化されたものから探す）
  let currentSourceHref = "";
  if (activeExternalFavicons.length > 0) {
    currentSourceHref = activeExternalFavicons[activeExternalFavicons.length - 1].href;
  } else if (externalFavicons.length > 0) {
    currentSourceHref = externalFavicons[externalFavicons.length - 1].href;
  } else {
    currentSourceHref = new URL("/favicon.ico", window.location.href).href;
  }

  // 既に自分たちのfaviconが最新の状態で適用されている場合はスキップ
  if (activeExternalFavicons.length === 0 && 
      ourFav && 
      ourFav.href === _lastGeneratedFaviconHref && 
      currentSourceHref === _lastSourceHref) {
    return;
  }

  _lastSourceHref = currentSourceHref;

  const match = {
    text: env.badgeText || env.id,
    color: env.badgeColor || "#888888",
    outlineColor: env.badgeOutlineColor || "#ffffff",
  };

  // 既存のファビコンを無効化
  externalFavicons.forEach(fav => {
    if (fav.disabled) return;
    fav.disabled = true;
    // サイト側のスクリプトが再有効化しにくいようにrelを一時的に変更する（任意）
    if (!fav.dataset.originalRel) {
      fav.dataset.originalRel = fav.rel;
    }
    fav.rel = "icon-disabled";
  });

  const absoluteHref = new URL(currentSourceHref, window.location.href).href;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  img.crossOrigin = "anonymous";

  const drawAndApply = () => {
    const size = Math.max(img.width || 32, 32);
    canvas.width = size;
    canvas.height = size;
    
    // 背景画像を描画
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

    // 新しいlink要素を作成（または既存のものを更新）
    let newFav = document.getElementById("env-icon-generated") as HTMLLinkElement;
    if (!newFav) {
      newFav = document.createElement("link");
      newFav.id = "env-icon-generated";
      newFav.rel = "icon";
      document.head.appendChild(newFav);
    }
    newFav.href = newHref;
  };

  img.onload = drawAndApply;
  img.onerror = drawAndApply;

  chrome.runtime.sendMessage({ type: "FETCH_IMAGE", url: absoluteHref }, (response) => {
    if (response && response.dataUrl) {
      img.src = response.dataUrl;
    } else {
      img.src = absoluteHref;
    }
  });
};

const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
  let shouldUpdate = false;
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      const addedNodes = Array.from(mutation.addedNodes);
      if (addedNodes.some(node => node instanceof HTMLLinkElement && node.id !== "env-icon-generated" && node.rel.includes("icon"))) {
        shouldUpdate = true;
        break;
      }
    } else if (mutation.type === "attributes") {
      const target = mutation.target as HTMLLinkElement;
      if (target instanceof HTMLLinkElement && target.id !== "env-icon-generated" && target.rel.includes("icon")) {
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

  // 定期的なチェック（3秒おき）
  setInterval(updateFavicon, 3000);
};

