export interface HostnamePattern {
  value: string;
  isRegex: boolean;
}

export interface SyncData {
  faviconEnabled?: boolean;
  prodHostnames?: (string | HostnamePattern)[];
  stgHostnames?: (string | HostnamePattern)[];
  devHostnames?: (string | HostnamePattern)[];

  prodBadgeText?: string;
  prodBadgeColor?: string;
  prodBadgeOutlineColor?: string;
  stgBadgeText?: string;
  stgBadgeColor?: string;
  stgBadgeOutlineColor?: string;
  devBadgeText?: string;
  devBadgeColor?: string;
  devBadgeOutlineColor?: string;
}
