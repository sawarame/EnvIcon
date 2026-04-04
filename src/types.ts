export interface HostnamePattern {
  value: string;
  isRegex: boolean;
}

export interface SyncData {
  faviconEnabled?: boolean;
  prodHostnames?: (string | HostnamePattern)[];
  stgHostnames?: (string | HostnamePattern)[];
  devHostnames?: (string | HostnamePattern)[];
}
