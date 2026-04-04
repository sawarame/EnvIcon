export interface HostnamePattern {
  value: string;
  isRegex: boolean;
}

export interface EnvironmentConfig {
  id: string;              // "prod" | "stg" | "dev" | "custom_<timestamp>"
  name: string;            // 表示名 (例: "Production", "QA")
  badgeText: string;
  badgeColor: string;
  badgeOutlineColor: string;
  hostnames: HostnamePattern[];
  isDeletable: boolean;    // trueならユーザーが削除可能
}

export interface SyncData {
  faviconEnabled?: boolean;
  environments?: EnvironmentConfig[];
}
