export interface HostnamePattern {
  value: string;
  isRegex: boolean;
}

export type PageBadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface EnvironmentConfig {
  id: string;              // "prod" | "stg" | "dev" | "custom_<timestamp>"
  name: string;            // 表示名 (例: "Production", "QA")
  badgeText: string;
  badgeColor: string;
  badgeOutlineColor: string;
  pageBadgePosition?: PageBadgePosition; // ページ内バッジの表示位置
  pageBadgeFontSize?: number;            // ページ内バッジの文字サイズ
  hostnames: HostnamePattern[];
  isDeletable: boolean;    // trueならユーザーが削除可能
}

export interface SyncData {
  faviconEnabled?: boolean;
  pageBadgeEnabled?: boolean;
  environments?: EnvironmentConfig[];
}
