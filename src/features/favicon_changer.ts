import {
  FetchImageResponse,
  SessionData,
  SyncData,
  TabInfoResponse,
} from "../types";
import { findMatchingEnv, isTemporarilyDisabled } from "./utils";

let _syncData: SyncData = {};
let _sessionData: SessionData = {};
let _lastGeneratedFaviconHref = "";
/** 最後に生成に使用した元のFaviconのURL */
let _lastSourceHref = "";
/** 最後に生成に使用したバッジ設定のシリアライズ文字列 */
let _lastMatchKey = "";
/** 前回の生成がフォールバック（白背景）だったかどうか */
let _lastAttemptFailed = false;
let _isUpdating = false;
let _pendingUpdate = false;
let _currentRequestId = 0;

const GENERATED_ID = "env-icon-generated";
const RESTORED_ID = "env-icon-restored";
const DISABLED_REL = "envicon-disabled-link";

/**
 * 対象の link 要素がサイト本来の favicon 関連要素かどうかを判定する関数
 * @param link - 検査対象の HTMLLinkElement
 * @returns favicon 関連の link 要素である場合は true、それ以外は false
 */
const isFaviconLink = (link: HTMLLinkElement): boolean => {
  if (link.id === GENERATED_ID || link.id === RESTORED_ID) return false;
  const rel = (link.rel || "").toLowerCase();
  // もともと favicon だったもの、または現在 favicon であるもの
  const isFav = rel.includes("icon") || rel.includes("shortcut");
  const wasFav = Boolean(link.dataset.originalRel);
  return isFav || wasFav;
};

/**
 * ページ内のすべての外部ファビコン関連 link 要素を取得する関数
 * @returns 外部ファビコン link 要素の配列
 */
const getExternalFavicons = (): HTMLLinkElement[] => {
  return Array.from(document.querySelectorAll<HTMLLinkElement>("link")).filter(
    isFaviconLink
  );
};

/**
 * EnvIcon が追加したファビコンを除去し、サイト本来のファビコン状態を復元する関数
 * @returns なし
 */
const restoreOriginalFavicons = (): void => {
  const existingGenerated = document.getElementById(GENERATED_ID);
  const hadGenerated = Boolean(existingGenerated);
  if (existingGenerated) {
    existingGenerated.remove();
  }

  const externalFavicons = getExternalFavicons();
  let restoredAnyExternal = false;

  externalFavicons.forEach((fav) => {
    if (fav.dataset.originalRel) {
      fav.rel = fav.dataset.originalRel;
      delete fav.dataset.originalRel;
      restoredAnyExternal = true;
    }
    if (fav.disabled) {
      fav.disabled = false;
      restoredAnyExternal = true;
    }
  });

  // 外部 link タグが存在する場合は補助復元用タグを除去する
  if (externalFavicons.length > 0) {
    const existingRestored = document.getElementById(RESTORED_ID);
    if (existingRestored) {
      existingRestored.remove();
    }
    // ブラウザに元のファビコン再評価を促すため最後の要素を再配置する
    if (restoredAnyExternal && document.head) {
      const lastFav = externalFavicons[externalFavicons.length - 1];
      document.head.appendChild(lastFav);
    }
  } else if (hadGenerated && _lastSourceHref && document.head) {
    // もともと link タグが無く暗黙の /favicon.ico 等を使っていたサイト向けに元のURLを復元する
    let restoredLink = document.getElementById(
      RESTORED_ID
    ) as HTMLLinkElement | null;
    if (!restoredLink) {
      restoredLink = document.createElement("link");
      restoredLink.id = RESTORED_ID;
      restoredLink.rel = "icon";
    }
    restoredLink.href = _lastSourceHref;
    document.head.appendChild(restoredLink);
  }

  _lastGeneratedFaviconHref = "";
  _lastSourceHref = "";
  _lastMatchKey = "";
  _lastAttemptFailed = false;
};

/**
 * バックグラウンドから現在のタブ情報を取得する非同期関数
 * @returns タブ情報レスポンス（取得失敗時は undefined）
 */
const requestTabInfo = (): Promise<TabInfoResponse | undefined> => {
  return new Promise<TabInfoResponse | undefined>((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "GET_TAB_INFO" }, (response: TabInfoResponse | undefined) => {
        if (chrome.runtime.lastError) {
          resolve(undefined);
          return;
        }
        resolve(response);
      });
    } catch {
      resolve(undefined);
    }
  });
};

/**
 * バックグラウンド経由で画像を Data URL として取得する非同期関数
 * @param url - 取得対象の画像URL
 * @returns 画像取得レスポンス（取得失敗時は undefined）
 */
const requestImageDataUrl = (
  url: string
): Promise<FetchImageResponse | undefined> => {
  return new Promise<FetchImageResponse | undefined>((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: "FETCH_IMAGE", url },
        (response: FetchImageResponse | undefined) => {
          if (chrome.runtime.lastError) {
            resolve(undefined);
            return;
          }
          resolve(response);
        }
      );
    } catch {
      resolve(undefined);
    }
  });
};

/**
 * 現在の設定とURLに基づいてファビコン要素を作成・更新または復元する非同期関数
 * @returns 更新処理の完了を表す Promise
 */
const updateFavicon = async (): Promise<void> => {
  if (_isUpdating) {
    _pendingUpdate = true;
    return;
  }
  _isUpdating = true;

  const requestId = ++_currentRequestId;

  try {
    const currentUrl = window.location.href;

    // 一時OFF（全体OFFまたはサイト単位OFF）の場合は元のファビコンへ復元する
    if (isTemporarilyDisabled(_sessionData, currentUrl)) {
      restoreOriginalFavicons();
      return;
    }

    const env = findMatchingEnv(_syncData.environments, currentUrl);

    if (!env || env.faviconEnabled === false) {
      restoreOriginalFavicons();
      return;
    }

    // バッジ適用時は補助復元用タグがもし残っていれば除去する
    const existingRestored = document.getElementById(RESTORED_ID);
    const restoredHref =
      existingRestored instanceof HTMLLinkElement ? existingRestored.href : "";
    if (existingRestored) {
      existingRestored.remove();
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
      // 最後に定義されたものを優先する（多くのサイトが末尾の要素で上書きするため）
      currentSourceHref = externalFavicons[externalFavicons.length - 1].href;
    } else if (restoredHref) {
      currentSourceHref = restoredHref;
    } else {
      // DOM内にない場合はブラウザが認識しているファビコン、またはルート直下の favicon.ico を使用する
      const tabInfo = await requestTabInfo();
      if (tabInfo?.favIconUrl && !tabInfo.favIconUrl.startsWith("data:")) {
        currentSourceHref = tabInfo.favIconUrl;
      } else {
        currentSourceHref = new URL("/favicon.ico", window.location.href).href;
      }
    }

    const absoluteSourceHref = new URL(currentSourceHref, window.location.href)
      .href;

    // ソースURLもバッジ設定も変わっておらず、前回成功している場合はキャッシュを再利用する
    if (
      _lastGeneratedFaviconHref &&
      absoluteSourceHref === _lastSourceHref &&
      currentMatchKey === _lastMatchKey &&
      !_lastAttemptFailed
    ) {
      externalFavicons.forEach((fav) => {
        if (fav.rel !== DISABLED_REL) {
          if (!fav.dataset.originalRel) fav.dataset.originalRel = fav.rel;
          fav.rel = DISABLED_REL;
          fav.disabled = true;
        }
      });

      let ourFav = document.getElementById(
        GENERATED_ID
      ) as HTMLLinkElement | null;
      if (
        !ourFav ||
        document.head?.lastElementChild !== ourFav ||
        ourFav.href !== _lastGeneratedFaviconHref
      ) {
        if (!ourFav) {
          ourFav = document.createElement("link");
          ourFav.id = GENERATED_ID;
          ourFav.rel = "icon";
        }
        ourFav.href = _lastGeneratedFaviconHref;
        document.head?.appendChild(ourFav);
      }
      return;
    }

    _lastSourceHref = absoluteSourceHref;
    _lastMatchKey = currentMatchKey;

    // 既存の外部ファビコンを無効化する
    externalFavicons.forEach((fav) => {
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

    /**
     * 読み込んだ元画像に環境バッジを重ねて描画し、DOMへ適用する関数
     * @returns なし
     */
    const drawAndApply = (): void => {
      // 古いリクエストの結果なら無視する
      if (requestId !== _currentRequestId) return;
      // 非同期読み込み中に一時OFFまたは対象外URLへ切り替わっていた場合は適用せず復元する
      const latestUrl = window.location.href;
      const latestEnv = findMatchingEnv(_syncData.environments, latestUrl);
      if (
        isTemporarilyDisabled(_sessionData, latestUrl) ||
        !latestEnv ||
        latestEnv.faviconEnabled === false
      ) {
        restoreOriginalFavicons();
        return;
      }

      const isFailed = img.width === 0;
      const previousAttemptSucceeded = !_lastAttemptFailed;
      _lastAttemptFailed = isFailed;

      // 読み込み失敗時、前回の成功データがある場合は維持する
      if (isFailed && _lastGeneratedFaviconHref && previousAttemptSucceeded) {
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

      let newFav = document.getElementById(
        GENERATED_ID
      ) as HTMLLinkElement | null;
      if (!newFav) {
        newFav = document.createElement("link");
        newFav.id = GENERATED_ID;
        newFav.rel = "icon";
      }
      newFav.href = newHref;
      document.head?.appendChild(newFav);
    };

    img.onload = drawAndApply;
    img.onerror = drawAndApply;

    const response = await requestImageDataUrl(absoluteSourceHref);
    if (requestId !== _currentRequestId) return;
    if (response?.dataUrl) {
      img.src = response.dataUrl;
    } else {
      img.src = absoluteSourceHref;
    }
  } finally {
    _isUpdating = false;
    if (_pendingUpdate) {
      _pendingUpdate = false;
      void updateFavicon();
    }
  }
};

/** head 内のファビコン変更を検知する MutationObserver */
const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
  let shouldUpdate = false;
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      const addedNodes = Array.from(mutation.addedNodes);
      const removedNodes = Array.from(mutation.removedNodes);
      if (
        addedNodes.some(
          (node) => node instanceof HTMLLinkElement && isFaviconLink(node)
        )
      ) {
        shouldUpdate = true;
        break;
      }
      if (
        removedNodes.some(
          (node) => node instanceof HTMLElement && node.id === GENERATED_ID
        )
      ) {
        shouldUpdate = true;
        break;
      }
    } else if (mutation.type === "attributes") {
      const target = mutation.target;
      if (target instanceof HTMLLinkElement && isFaviconLink(target)) {
        shouldUpdate = true;
        break;
      }
    }
  }
  if (shouldUpdate) {
    void updateFavicon();
  }
});

/**
 * Favicon 動的書き換え機能を初期化し、DOM監視および定期チェックを開始する関数
 * @param syncData - 同期ストレージの設定データ
 * @param sessionData - セッションストレージの一時OFF設定データ
 * @returns なし
 */
export const initializeFaviconChangerFeature = (
  syncData: SyncData,
  sessionData: SessionData = {}
): void => {
  _syncData = syncData;
  _sessionData = sessionData;
  void updateFavicon();

  const target = document.querySelector("head");
  if (target) {
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "rel"],
    });
  }

  setInterval(() => {
    void updateFavicon();
  }, 3000);
};

/**
 * 設定変更や一時OFF切り替え時に Favicon 表示を即座に再評価する関数
 * @param syncData - 最新の同期ストレージ設定データ
 * @param sessionData - 最新のセッションストレージ一時OFF設定データ
 * @returns なし
 */
export const refreshFaviconChangerFeature = (
  syncData: SyncData,
  sessionData: SessionData
): void => {
  _syncData = syncData;
  _sessionData = sessionData;
  void updateFavicon();
};
