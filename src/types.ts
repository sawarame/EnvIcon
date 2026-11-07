/**
 * 環境判定に使用するURLパターンまたは正規表現パターンの設定型
 */
export interface HostnamePattern {
  /** 正規化済みURLパターン文字列（hostname[:port][/path]）または正規表現文字列 */
  value: string;
  /** 正規表現として評価するかどうか */
  isRegex: boolean;
  /** パターンが有効かどうか（デフォルト: true） */
  enabled?: boolean;
}

/**
 * 通常モードのURLパターン文字列を構造化解析・正規化した結果を表すインターフェース
 */
export interface ParsedUrlPattern {
  /** 正規化済みパターン文字列（hostname[:port][/path]） */
  normalized: string;
  /** 小文字化されたホスト名 */
  hostname: string;
  /** 指定されたポート番号文字列（未指定または標準ポート省略時は空文字） */
  port: string;
  /** 先頭スラッシュを含み末尾スラッシュを除いたケース維持パス（未指定時は空文字） */
  path: string;
  /** パスのセグメント数（未指定時は 0） */
  pathSegmentCount: number;
}

/**
 * 検査対象ページまたはURLチェッカー入力のロケーション情報を表すインターフェース
 */
export interface TargetLocation {
  /** 小文字化されたホスト名 */
  hostname: string;
  /** URL上の非標準ポート番号（標準ポート時は空文字） */
  port: string;
  /** プロトコル既定値を含む実効ポート番号（httpは"80"、httpsは"443"、非標準時はその値） */
  effectivePort: string;
  /** ポップアップ表示および一時OFF識別用のホスト識別子（hostname[:port]） */
  hostWithPort: string;
  /** ケース維持されたURLパス（最低 "/"） */
  pathname: string;
  /** 末尾スラッシュを除去した比較用パス（"/" のみの場合は空文字） */
  normalizedPath: string;
  /** 正規表現評価用のホスト＋パス文字列（hostWithPort + pathname） */
  hostAndPath: string;
}

/**
 * 複数パターン一致時の優先順位（詳細度）を比較するためのベクトル型
 */
export interface MatchSpecificity {
  /** 大分類レベル（3: パスあり ＞ 2: ポートあり ＞ 1: ホストのみ） */
  tier: 1 | 2 | 3;
  /** 同一階層内のルール種別（1: 通常パターン ＞ 0: 正規表現パターン） */
  isExactRule: 0 | 1;
  /** パスのセグメント数（深い階層ほど優先） */
  pathSegmentCount: number;
  /** パスの文字数（長いパスほど優先） */
  pathLength: number;
  /** パス付きパターンにおけるポート指定有無（1: あり ＞ 0: なし） */
  hasPort: 0 | 1;
  /** 環境配列内のインデックス（小さいほど優先） */
  envIndex: number;
  /** 環境内パターン配列のインデックス（小さいほど優先） */
  patternIndex: number;
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
 * オプション設定画面における環境ごとのバリデーションエラー状態を表すインターフェース
 */
export interface EnvValidationErrorState {
  /** 環境名が空欄エラーかどうか */
  invalidName: boolean;
  /** バッジ文字色が不正なHEX形式かどうか */
  invalidBadgeColor: boolean;
  /** バッジフチドリ色が不正なHEX形式かどうか */
  invalidBadgeOutlineColor: boolean;
  /** ページ内バッジ文字サイズが範囲外かどうか */
  invalidPageBadgeFontSize: boolean;
  /** 不正または重複と判定されたパターン行のインデックス配列 */
  invalidPatternIndices: number[];
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
  /** サイト単位で一時OFFにしているホスト識別子（小文字の hostname[:port]）の配列 */
  disabledHostnames?: string[];
}

/**
 * 環境マッチングの詳細結果を表すインターフェース
 */
export interface EnvMatchDetail {
  /** 最終的に採用された環境設定 */
  env: EnvironmentConfig;
  /** 採用された環境の environments 配列内インデックス */
  envIndex: number;
  /** 採用されたパターン設定 */
  pattern: HostnamePattern;
  /** 採用されたパターンの hostnames 配列内インデックス */
  patternIndex: number;
  /** 正規表現による一致かどうか */
  isRegexMatch: boolean;
  /** 通常パターンかつ対象ページの hostWithPort と完全一致するかどうか（ポップアップ編集可否） */
  isExactHostPortMatch: boolean;
}

/**
 * コンテンツスクリプトからサービスワーカーへ送信する画像プロキシ取得リクエスト型
 */
export interface FetchImageMessage {
  /** メッセージ種別 */
  type: "FETCH_IMAGE";
  /** 取得対象の画像URL */
  url: string;
}

/**
 * コンテンツスクリプトからサービスワーカーへ送信するタブ情報取得リクエスト型
 */
export interface GetTabInfoMessage {
  /** メッセージ種別 */
  type: "GET_TAB_INFO";
}

/**
 * コンテンツスクリプトからサービスワーカーへ送信されるリクエストメッセージの共用体型
 */
export type RuntimeRequestMessage = FetchImageMessage | GetTabInfoMessage;

/**
 * サービスワーカーからコンテンツスクリプトへ通知される画面内URL変更メッセージ型
 */
export interface TabUrlChangedMessage {
  /** メッセージ種別 */
  type: "URL_CHANGED";
  /** 変更後のタブURL */
  url: string;
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
