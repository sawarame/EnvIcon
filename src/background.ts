// background.ts - Service Worker

import { findMatchingEnv } from "./features/utils";
import { SyncData, EnvironmentConfig } from "./types";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "options.html" });
  }
});

// アイコンをクリックしたらオプション画面を開く
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "options.html" });
});

let _baseIconBitmap: ImageBitmap | null = null;

/**
 * 拡張機能のベースアイコンを読み込む
 */
const getBaseIcon = async (): Promise<ImageBitmap> => {
  if (_baseIconBitmap) return _baseIconBitmap;
  const url = chrome.runtime.getURL("/icons/icon32.png");
  const response = await fetch(url);
  const blob = await response.blob();
  _baseIconBitmap = await createImageBitmap(blob);
  return _baseIconBitmap;
};

/**
 * 指定された環境設定に基づいて、バッジ付きのアイコンを生成して適用する
 */
const updateActionIcon = async (tabId: number, env: EnvironmentConfig | null) => {
  if (!env) {
    // デフォルトアイコンに戻す
    try {
      await chrome.action.setIcon({
        path: {
          "16": "/icons/icon16.png",
          "32": "/icons/icon32.png",
          "48": "/icons/icon48.png",
          "128": "/icons/icon128.png"
        },
        tabId
      });
      await chrome.action.setBadgeText({ text: "", tabId });
    } catch (e) {
      console.error("Failed to reset action icon:", e);
    }
    return;
  }

  try {
    const icon = await getBaseIcon();
    const size = 32;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ベースアイコンを描画
    ctx.drawImage(icon, 0, 0, size, size);

    const text = (env.badgeText || env.id).substring(0, 4);
    const color = env.badgeColor || "#888888";
    const outlineColor = env.badgeOutlineColor || "#ffffff";

    // faviconの描画ロジックに近い形で描画
    const fontSize = 14;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeText(text, size / 2, size - 2);

    ctx.fillStyle = color;
    ctx.fillText(text, size / 2, size - 2);

    const imageData = ctx.getImageData(0, 0, size, size);
    await chrome.action.setIcon({
      imageData: { "32": imageData },
      tabId
    });
    
    // 以前のテキストバッジが残っている可能性があるのでクリア
    await chrome.action.setBadgeText({ text: "", tabId });
  } catch (e) {
    console.error("Failed to update action icon:", e);
  }
};

/**
 * 指定されたタブのアクションアイコンのバッジを更新する
 */
const updateActionBadge = async (tabId: number, url: string | undefined) => {
  if (!url) {
    updateActionIcon(tabId, null);
    return;
  }

  try {
    const hostname = new URL(url).hostname;
    chrome.storage.sync.get(null, (syncData: SyncData) => {
      const env = findMatchingEnv(syncData.environments, hostname);
      updateActionIcon(tabId, env);
    });
  } catch (e) {
    // URLが無効な場合（chrome://など）はデフォルトに戻す
    updateActionIcon(tabId, null);
  }
};

// タブのURLが更新されたとき
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" || changeInfo.url) {
    updateActionBadge(tabId, tab.url);
  }
});

// タブが切り替わったとき
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) {
      return;
    }
    updateActionBadge(activeInfo.tabId, tab?.url);
  });
});

// Content Scriptからのリクエストを中継してCORSを回避する
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_IMAGE") {
    fetch(message.url)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ dataUrl: reader.result });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error("Proxy fetch failed:", error);
        sendResponse({ error: error.message });
      });
    return true; // 非同期応答を許可
  } else if (message.type === "GET_TAB_INFO") {
    sendResponse({
      favIconUrl: sender.tab?.favIconUrl,
      url: sender.tab?.url
    });
    return false;
  }
});
