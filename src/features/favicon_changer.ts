import { SyncData, HostnamePattern } from "../types";

let _syncData: SyncData = {};
let _lastGeneratedFaviconHref = "";

const getFavicon = (): HTMLLinkElement | null => {
  return (
    document.querySelector<HTMLLinkElement>("link[rel='icon']") ||
    document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']")
  );
};

/**
 * Checks if the current hostname matches any of the given patterns.
 */
const isMatch = (
  patterns: (string | HostnamePattern)[] | undefined,
  currentHostname: string
): boolean => {
  if (!patterns) return false;
  return patterns.some((p) => {
    if (typeof p === "string") {
      return p === currentHostname;
    }
    if (p.isRegex) {
      try {
        const re = new RegExp(p.value);
        return re.test(currentHostname);
      } catch {
        return false;
      }
    }
    return p.value === currentHostname;
  });
};

const updateFavicon = () => {
  const favicon = getFavicon();
  if (!favicon) {
    console.log("Favicon not found.");
    return;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const img = new Image();
  img.crossOrigin = "Anonymous";

  img.onload = () => {
    const size = img.width; // Assume square
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    let text: string, color: string, outlineColor: string;
    const currentHostname = window.location.hostname;

    if (isMatch(_syncData.prodHostnames, currentHostname)) {
      text = _syncData.prodBadgeText || "prod";
      color = _syncData.prodBadgeColor || "#FF0000";
      outlineColor = _syncData.prodBadgeOutlineColor || "#FFFFFF";
    } else if (isMatch(_syncData.stgHostnames, currentHostname)) {
      text = _syncData.stgBadgeText || "stg";
      color = _syncData.stgBadgeColor || "#0000FF";
      outlineColor = _syncData.stgBadgeOutlineColor || "#FFFFFF";
    } else if (isMatch(_syncData.devHostnames, currentHostname)) {
      text = _syncData.devBadgeText || "dev";
      color = _syncData.devBadgeColor || "#008000";
      outlineColor = _syncData.devBadgeOutlineColor || "#FFFFFF";
    } else {
      return;
    }

    // Text styling
    const fontSize = Math.max(Math.round(size / 2.5), 6); // Dynamic font size
    ctx.font = `bold ${fontSize}px "Arial"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    // Draw text outline (white border)
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = Math.max(size / 12, 2);
    ctx.lineJoin = "round";
    ctx.strokeText(text, size / 2, size - 1);

    // Draw text body (environment color)
    ctx.fillStyle = color;
    ctx.fillText(text, size / 2, size - 1);

    // Replace favicon
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
        // SPAなどで書き換えられた場合のみ再発火させる（自身の書き換えによるループを防ぐ）
        if (target.href !== _lastGeneratedFaviconHref) {
          updateFavicon();
          return;
        }
      }
    }
  }
});

export const initializeFaviconChangerFeature = (
  syncData: SyncData
) => {
  _syncData = syncData;

  // Handle cases where the favicon already exists at script injection time
  if (getFavicon()) {
    window.addEventListener("load", updateFavicon);
    updateFavicon();
  }

  // Observe the head for dynamically added favicons
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
