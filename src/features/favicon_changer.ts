import { SyncData, EnvironmentConfig } from "../types";
import { findMatchingEnv } from "./utils";

let _syncData: SyncData = {};
let _lastGeneratedFaviconHref = "";

const FAVICON_SELECTOR = "link[rel*='icon']";

/**
 * 全てのファビコン関連のlink要素を取得する。
 */
const getFavicons = (): HTMLLinkElement[] => {
  return Array.from(document.querySelectorAll<HTMLLinkElement>(FAVICON_SELECTOR)).filter(
    (link) => {
      const rel = link.rel.toLowerCase();
      return rel.includes("icon");
    }
  );
};

/**
 * 新しいファビコン要素を作成・または更新する。
 */
const updateFavicon = async () => {
  const env = findMatchingEnv(_syncData.environments, window.location.hostname);
  if (!env) return;

  const match = {
    text: env.badgeText || env.id,
    color: env.badgeColor || "#888888",
    outlineColor: env.badgeOutlineColor || "#ffffff",
  };

  const favicons = getFavicons();
  let originalHref = "";
  
  // 既存のファビコンを無効化し、最大のサイズと思われるもののURLを特定する
  favicons.forEach(fav => {
    if (fav.href === _lastGeneratedFaviconHref) return;
    originalHref = fav.href;
    fav.setAttribute("rel", "icon-disabled"); // 無効化
    fav.disabled = true;
  });

  // 既存のタグがない場合、デフォルトのfavicon.icoを試す
  if (!originalHref) {
    originalHref = "/favicon.ico";
  }

  const absoluteHref = new URL(originalHref, window.location.href).href;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  img.crossOrigin = "anonymous";

  const drawAndApply = () => {
    const size = Math.max(img.width || 32, 32);
    canvas.width = size;
    canvas.height = size;
    
    // 背景画像を描画（読み込み失敗時は白背景）
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
  img.onerror = drawAndApply; // 画像なしでも描画を試みる

  // Background Proxy経由で画像を取得（CORS回避）
  chrome.runtime.sendMessage({ type: "FETCH_IMAGE", url: absoluteHref }, (response) => {
    if (response && response.dataUrl) {
      img.src = response.dataUrl;
    } else {
      // プロキシ経由でも失敗した場合は直接試す
      img.src = absoluteHref;
    }
  });
};

const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
  let shouldUpdate = false;
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      const addedNodes = Array.from(mutation.addedNodes);
      if (addedNodes.some(node => node instanceof HTMLLinkElement && node.rel.includes("icon") && node.id !== "env-icon-generated")) {
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

  // 初期実行
  updateFavicon();

  // 監視開始（head内の変更を監視）
  const target = document.querySelector("head");
  if (target) {
    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }
};
