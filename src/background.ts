import {
  createDefaultEnvironments,
  extractSupportedHostname,
  findMatchingEnv,
  getSessionData,
  isTemporarilyDisabled,
} from "./features/utils";
import { EnvironmentConfig, SessionData, SyncData } from "./types";

/**
 * コンテンツスクリプトからも chrome.storage.session を参照できるようアクセスレベルを設定する非同期関数
 * @returns 設定完了を表す Promise
 */
const configureSessionStorageAccess = async (): Promise<void> => {
  try {
    if (chrome.storage?.session?.setAccessLevel) {
      await chrome.storage.session.setAccessLevel({
        accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
      });
    }
  } catch (error) {
    console.error("セッションストレージのアクセス権限設定に失敗しました:", error);
  }
};

// サービスワーカー起動時にセッションストレージのアクセス権を構成する
void configureSessionStorageAccess();

chrome.runtime.onStartup.addListener(() => {
  void configureSessionStorageAccess();
});

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    await configureSessionStorageAccess();
    if (details.reason === "install") {
      const existing = (await chrome.storage.sync.get("environments")) as SyncData;
      if (!existing.environments || existing.environments.length === 0) {
        await chrome.storage.sync.set({
          environments: createDefaultEnvironments(),
        });
      }
      await chrome.tabs.create({ url: "options.html" });
    }
  })();
});

let _baseIconBitmap: ImageBitmap | null = null;

/**
 * 拡張機能のベースアイコン画像を読み込んでキャッシュする非同期関数
 * @returns 32x32 アイコンの ImageBitmap
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
 * Canvas 上に描画済みの画像をグレースケールおよび半透明（ミュート状態）に変換する関数
 * @param ctx - 対象の OffscreenCanvas 2D コンテキスト
 * @param size - キャンバスの縦横サイズ（ピクセル）
 */
const applyGrayscaleMuteFilter = (
  ctx: OffscreenCanvasRenderingContext2D,
  size: number
): void => {
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    data[i] = lum;
    data[i + 1] = lum;
    data[i + 2] = lum;
    data[i + 3] = Math.round(data[i + 3] * 0.65);
  }
  ctx.putImageData(imgData, 0, 0);
};

/**
 * 指定された環境設定および一時OFF状態に基づいて、ツールバーのアクションアイコンを更新する非同期関数
 * @param tabId - 更新対象のタブID
 * @param env - マッチした環境設定（未マッチ時は null）
 * @param isMuted - 一時OFF（全体OFFまたは対象サイトのOFF）が有効かどうか
 * @returns アイコン更新完了を表す Promise
 */
const updateActionIcon = async (
  tabId: number,
  env: EnvironmentConfig | null,
  isMuted: boolean
): Promise<void> => {
  if (isMuted) {
    try {
      const icon = await getBaseIcon();
      const size = 32;
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(icon, 0, 0, size, size);
      applyGrayscaleMuteFilter(ctx, size);

      // 一時OFF中であることが一目で判別できるよう OFF インジケーターを重ねる
      const fontSize = 12;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeText("OFF", size / 2, size - 2);

      ctx.fillStyle = "#475569";
      ctx.fillText("OFF", size / 2, size - 2);

      const imageData = ctx.getImageData(0, 0, size, size);
      await chrome.action.setIcon({
        imageData: { "32": imageData },
        tabId,
      });
      await chrome.action.setBadgeText({ text: "", tabId });
    } catch {
      // タブが既に閉じられている場合などのエラーは無視する
    }
    return;
  }

  if (!env) {
    // 通常のデフォルトアイコンに戻す
    try {
      await chrome.action.setIcon({
        path: {
          "16": "/icons/icon16.png",
          "32": "/icons/icon32.png",
          "48": "/icons/icon48.png",
          "128": "/icons/icon128.png",
        },
        tabId,
      });
      await chrome.action.setBadgeText({ text: "", tabId });
    } catch {
      // タブが既に閉じられている場合などのエラーは無視する
    }
    return;
  }

  try {
    const icon = await getBaseIcon();
    const size = 32;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ベースアイコンを描画する
    ctx.drawImage(icon, 0, 0, size, size);

    const text = (env.badgeText || env.id).substring(0, 4);
    const color = env.badgeColor || "#888888";
    const outlineColor = env.badgeOutlineColor || "#ffffff";

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
      tabId,
    });

    // 以前のテキストバッジが残っている可能性があるためクリアする
    await chrome.action.setBadgeText({ text: "", tabId });
  } catch {
    // タブが既に閉じられている場合などのエラーは無視する
  }
};

/**
 * 指定されたタブのURLとストレージ状態からアクションアイコンを評価・更新する非同期関数
 * @param tabId - 更新対象のタブID
 * @param url - 対象タブのURL文字列
 * @param preloadedSync - 事前取得済みの同期データ（省略時は内部で取得）
 * @param preloadedSession - 事前取得済みのセッションデータ（省略時は内部で取得）
 * @returns 更新完了を表す Promise
 */
const updateActionBadge = async (
  tabId: number,
  url: string | undefined,
  preloadedSync?: SyncData,
  preloadedSession?: SessionData
): Promise<void> => {
  const [syncData, sessionData] = await Promise.all([
    preloadedSync
      ? Promise.resolve(preloadedSync)
      : (chrome.storage.sync.get(null) as Promise<SyncData>),
    preloadedSession ? Promise.resolve(preloadedSession) : getSessionData(),
  ]);

  // 全体一時OFFが有効な場合はすべてのタブでミュートアイコンを表示する
  if (sessionData.globalDisabled === true) {
    await updateActionIcon(tabId, null, true);
    return;
  }

  const hostname = extractSupportedHostname(url);
  if (!hostname) {
    await updateActionIcon(tabId, null, false);
    return;
  }

  if (isTemporarilyDisabled(sessionData, hostname)) {
    await updateActionIcon(tabId, null, true);
    return;
  }

  const env = findMatchingEnv(syncData.environments, hostname);
  await updateActionIcon(tabId, env, false);
};

/**
 * 現在開いているすべてのタブのアクションアイコンを一括で再評価する非同期関数
 * @returns 全タブの更新完了を表す Promise
 */
const refreshAllTabsActionBadge = async (): Promise<void> => {
  try {
    const [tabs, syncData, sessionData] = await Promise.all([
      chrome.tabs.query({}),
      chrome.storage.sync.get(null) as Promise<SyncData>,
      getSessionData(),
    ]);

    await Promise.all(
      tabs.map((tab) => {
        if (typeof tab.id === "number") {
          return updateActionBadge(tab.id, tab.url, syncData, sessionData);
        }
        return Promise.resolve();
      })
    );
  } catch (error) {
    console.error("全タブのアイコン更新に失敗しました:", error);
  }
};

// タブのURLや読み込み状態が更新されたときにアイコンを更新する
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" || changeInfo.url) {
    void updateActionBadge(tabId, tab.url);
  }
});

// アクティブなタブが切り替わったときにアイコンを更新する
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) {
      return;
    }
    void updateActionBadge(activeInfo.tabId, tab?.url);
  });
});

// 環境設定または一時OFF設定が変更されたときに全タブのアイコンをリアルタイム更新する
chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "sync" || areaName === "session") {
    void refreshAllTabsActionBadge();
  }
});

/** コンテンツスクリプトからのメッセージ型定義 */
interface RuntimeMessage {
  /** メッセージ種別 */
  type: "FETCH_IMAGE" | "GET_TAB_INFO";
  /** 画像取得対象URL（FETCH_IMAGE 時に使用） */
  url?: string;
}

// コンテンツスクリプトからの画像取得・タブ情報リクエストを中継する
chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, sender, sendResponse) => {
    if (message.type === "FETCH_IMAGE" && message.url) {
      fetch(message.url)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            sendResponse({ dataUrl: reader.result });
          };
          reader.readAsDataURL(blob);
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error("画像プロキシ取得に失敗しました:", errorMessage);
          sendResponse({ error: errorMessage });
        });
      return true;
    } else if (message.type === "GET_TAB_INFO") {
      sendResponse({
        favIconUrl: sender.tab?.favIconUrl,
        url: sender.tab?.url,
      });
      return false;
    }
    return false;
  }
);
