import { SyncData, HostnamePattern, EnvironmentConfig } from "../types";

let _syncData: SyncData = {};
let _lastGeneratedFaviconHref = "";

const getFavicon = (): HTMLLinkElement | null => {
  return (
    document.querySelector<HTMLLinkElement>("link[rel='icon']") ||
    document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']")
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
 * 新フォーマット(environments)を優先し、ない場合は旧フォーマットにフォールバック。
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

const updateFavicon = () => {
  const favicon = getFavicon();
  if (!favicon) {
    console.log("Favicon not found.");
    return;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  img.crossOrigin = "Anonymous";

  img.onload = () => {
    const size = img.width;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    const match = findMatchingEnv(window.location.hostname);
    if (!match) return;

    const { text, color, outlineColor } = match;

    const fontSize = Math.max(Math.round(size / 2.5), 6);
    ctx.font = `bold ${fontSize}px "Arial"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = Math.max(size / 12, 2);
    ctx.lineJoin = "round";
    ctx.strokeText(text, size / 2, size - 1);

    ctx.fillStyle = color;
    ctx.fillText(text, size / 2, size - 1);

    _lastGeneratedFaviconHref = canvas.toDataURL("image/png");
    favicon.href = _lastGeneratedFaviconHref;
  };

  img.onerror = (e) => {
    console.error("Error loading favicon image:", e);
  };

  fetch(favicon.href, { cache: "no-cache" })
    .then((response) => response.blob())
    .then((blob) => {
      img.src = URL.createObjectURL(blob);
    })
    .catch((e) => {
      console.error("Fetching favicon failed:", e);
      img.src = favicon.href;
    });
};

const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      const faviconNode = Array.from(mutation.addedNodes).find(
        (node) =>
          node instanceof HTMLLinkElement &&
          (node.rel === "icon" || node.rel === "shortcut icon")
      );
      if (faviconNode) {
        updateFavicon();
        return;
      }
    } else if (
      mutation.type === "attributes" &&
      mutation.attributeName === "href"
    ) {
      const target = mutation.target;
      if (
        target instanceof HTMLLinkElement &&
        (target.rel === "icon" || target.rel === "shortcut icon")
      ) {
        if (target.href !== _lastGeneratedFaviconHref) {
          updateFavicon();
          return;
        }
      }
    }
  }
});

export const initializeFaviconChangerFeature = (syncData: SyncData) => {
  _syncData = syncData;

  if (getFavicon()) {
    window.addEventListener("load", updateFavicon);
    updateFavicon();
  }

  const head = document.querySelector("head");
  if (head) {
    observer.observe(head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
  }
};
