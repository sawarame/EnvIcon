import type { TabUrlChangedMessage } from "../types";
import { parseTargetLocation } from "./utils";

let _isInitialized = false;
let _lastLocationKey = "";

/**
 * URL文字列からクエリおよびハッシュを除外した比較用ロケーションキー（hostWithPort + pathname）を算出する関数
 * @param urlStr - 評価対象のURL文字列
 * @returns 比較用のロケーションキー文字列（対象外URLの場合は空文字）
 */
const extractLocationKey = (urlStr: string): string => {
  const target = parseTargetLocation(urlStr);
  return target ? target.hostAndPath : "";
};

/**
 * 受信したランタイムメッセージが TabUrlChangedMessage であるか判定する型ガード関数
 * @param message - 検査対象の受信メッセージ
 * @returns TabUrlChangedMessage 型である場合は true、それ以外は false
 */
const isTabUrlChangedMessage = (
  message: unknown
): message is TabUrlChangedMessage => {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const record = message as Record<string, unknown>;
  return record.type === "URL_CHANGED" && typeof record.url === "string";
};

/**
 * ページ再読み込みを伴わない画面内URL遷移（SPA遷移・ブラウザ戻る/進む）を監視し、
 * ホスト・ポート・パスのいずれかが変化した際のみコールバックを発火する関数
 * @param onLocationChange - ロケーション（hostWithPort + pathname）変化時に呼び出されるコールバック関数
 * @returns なし
 */
export const initializeUrlObserverFeature = (
  onLocationChange: () => void
): void => {
  if (_isInitialized) {
    return;
  }
  _isInitialized = true;
  _lastLocationKey = extractLocationKey(window.location.href);

  /**
   * 現在の window.location.href を再評価し、前回キーから変化があればコールバックを実行する内部関数
   * @returns なし
   */
  const handlePotentialUrlChange = (): void => {
    const nextKey = extractLocationKey(window.location.href);
    // クエリ（?）やハッシュ（#）のみの変化ではキーが同一となるため再描画しない
    if (nextKey === _lastLocationKey) {
      return;
    }
    _lastLocationKey = nextKey;
    onLocationChange();
  };

  // サービスワーカー（chrome.tabs.onUpdated）からの画面内URL変更通知を購読する
  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (isTabUrlChangedMessage(message)) {
      handlePotentialUrlChange();
    }
    return false;
  });

  // ブラウザの戻る・進む操作（popstate）によるURL変更を購読する
  window.addEventListener("popstate", () => {
    handlePotentialUrlChange();
  });
};
