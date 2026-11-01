/**
 * 環境判定に使用するホスト名または正規表現パターンの設定型
 */
export interface HostnamePattern {
  /** ホスト名または正規表現文字列 */
  value: string;
  /** 正規表現として評価するかどうか */
  isRegex: boolean;
  /** パターンが有効かどうか（デフォルト: true） */
  enabled?: boolean;
}

/**
 * ページ内バッジの表示位置を表す型
 */
export type PageBadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * 各環境の設定情報を表すインターフェース
 */
export interface EnvironmentConfig {
  /** 環境識別子 ("prod" | "stg" | "dev" | "custom_<timestamp>") */
  id: string;
  /** 表示名 (例: "Production", "QA") */
  name: string;
  /** バッジに表示する文字列（最大4文字） */
  badgeText: string;
  /** バッジの文字色（HEX形式） */
  badgeColor: string;
  /** バッジのフチドリ色（HEX形式） */
  badgeOutlineColor: string;
  /** Favicon書き換えの環境ごとのON/OFF（デフォルト: true） */
  faviconEnabled?: boolean;
  /** ページ内バッジ表示の環境ごとのON/OFF（デフォルト: true） */
  pageBadgeEnabled?: boolean;
  /** コンソールログ表示の環境ごとのON/OFF（デフォルト: true） */
  consoleLogEnabled?: boolean;
  /** ページ内バッジの表示位置 */
  pageBadgePosition?: PageBadgePosition;
  /** ページ内バッジの文字サイズ（px） */
  pageBadgeFontSize?: number;
  /** ホスト名パターンの配列 */
  hostnames: HostnamePattern[];
  /** ユーザーが削除可能かどうか（PROD/STG/DEVは false） */
  isDeletable: boolean;
}

/**
 * chrome.storage.sync に保存されるデータ構造
 */
export interface SyncData {
  /** 環境設定の配列 */
  environments?: EnvironmentConfig[];
}

/**
 * chrome.storage.session に保存される一時OFF状態のデータ構造
 * ブラウザを閉じると自動的にクリアされ、ON状態に復帰する
 */
export interface SessionData {
  /** 拡張機能全体の一時OFFフラグ（true の場合は全サイトで無効化） */
  globalDisabled?: boolean;
  /** サイト単位で一時OFFにしているホスト名（小文字）の配列 */
  disabledHostnames?: string[];
}

/**
 * 環境マッチングの詳細結果を表すインターフェース
 */
export interface EnvMatchDetail {
  /** 一致した環境設定 */
  env: EnvironmentConfig;
  /** 一致したホスト名パターン */
  pattern: HostnamePattern;
  /** 正規表現による一致かどうか */
  isRegexMatch: boolean;
}

/**
 * バックグラウンドから取得するタブ情報のレスポンス型
 */
export interface TabInfoResponse {
  /** ブラウザが認識しているFaviconのURL */
  favIconUrl?: string;
  /** タブのURL */
  url?: string;
}

/**
 * バックグラウンド経由の画像取得レスポンス型
 */
export interface FetchImageResponse {
  /** Data URL形式の画像データ */
  dataUrl?: string;
  /** エラー発生時のメッセージ */
  error?: string;
}
