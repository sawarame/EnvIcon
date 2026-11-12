import { EnvironmentConfig } from "../types";

/**
 * デフォルトの環境設定（PROD / STG / DEV）を生成して返す関数
 * @returns 初期状態の環境設定オブジェクトの配列
 */
export const createDefaultEnvironments = (): EnvironmentConfig[] => [
  {
    id: "prod",
    name: "Production",
    badgeText: "prod",
    badgeColor: "#ff0000",
    badgeOutlineColor: "#ffffff",
    faviconEnabled: true,
    pageBadgeEnabled: true,
    consoleLogEnabled: true,
    pageBadgePosition: "bottom-right",
    pageBadgeFontSize: 24,
    hostnames: [],
    isDeletable: false,
  },
  {
    id: "stg",
    name: "Staging",
    badgeText: "stg",
    badgeColor: "#0000ff",
    badgeOutlineColor: "#ffffff",
    faviconEnabled: true,
    pageBadgeEnabled: true,
    consoleLogEnabled: true,
    pageBadgePosition: "bottom-right",
    pageBadgeFontSize: 24,
    hostnames: [],
    isDeletable: false,
  },
  {
    id: "dev",
    name: "Development",
    badgeText: "dev",
    badgeColor: "#008000",
    badgeOutlineColor: "#ffffff",
    faviconEnabled: true,
    pageBadgeEnabled: true,
    consoleLogEnabled: true,
    pageBadgePosition: "bottom-right",
    pageBadgeFontSize: 24,
    hostnames: [],
    isDeletable: false,
  },
];
