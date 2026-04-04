import { SyncData, HostnamePattern, EnvironmentConfig } from "../types";

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
 * 現在のホスト名がパターン群のいずれかに一致するか検証する。
 */
const isMatch = (
  patterns: (string | HostnamePattern)[] | undefined,
  currentHostname: string
): boolean => {
  if (!patterns) return false;
  return patterns.some((p) => {
    if (typeof p === "string") return p === currentHostname;
    if (p.isRegex) {
      try {
        return new RegExp(p.value).test(currentHostname);
      } catch {
        return false;
      }
    }
    return p.value === currentHostname;
  });
};

/**
 * 現在のホスト名に一致する環境設定を返す。
 */
const findMatchingEnv = (
  currentHostname: string
): { text: string; color: string; outlineColor: string } | null => {
  if (!_syncData.environments) return null;
  for (const env of _syncData.environments) {
    if (isMatch(env.hostnames, currentHostname)) {
      return {
        text: env.badgeText || env.id,
        color: env.badgeColor || "#888888",
        outlineColor: env.badgeOutlineColor || "#ffffff",
      };
    }
  }
  return null;
};

/**
 * 新しいファビコン要素を作成・または更新する。
 */
const updateFavicon = async () => {
  const match = findMatchingEnv(window.location.hostname);
  if (!match) return;

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

    canvas.toBlob((blob) => {
      if (blob) {
        const newHref = URL.createObjectURL(blob);
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
      }
    }, "image/png");
  };

  img.onload = drawAndApply;
  img.onerror = drawAndApply; // 画像なしでも描画を試みる

  // Background Proxy経由で画像を取得（CORS回避）
  chrome.runtime.sendMessage({ type: "FETCH_IMAGE", url: originalHref }, (response) => {
    if (response && response.dataUrl) {
      img.src = response.dataUrl;
    } else {
      // プロキシ経由でも失敗した場合は直接試す
      img.src = originalHref;
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
