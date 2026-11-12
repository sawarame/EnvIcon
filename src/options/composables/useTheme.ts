import { ref } from "vue";

/**
 * ダークモード・ライトモードのテーマ状態管理を行う Composable
 * @returns テーマ状態および切り替え関数群
 */
export const useTheme = () => {
  const isDarkMode = ref(false);

  /**
   * ダークモードの適用状態をDOMに反映する内部関数
   * @param dark - ダークモードを有効にする場合は true
   * @returns なし
   */
  const applyTheme = (dark: boolean): void => {
    isDarkMode.value = dark;
    if (dark) {
      document.documentElement.classList.add("my-app-dark");
    } else {
      document.documentElement.classList.remove("my-app-dark");
    }
  };

  /**
   * 保存済み設定またはシステム設定に基づいてテーマを初期化する関数
   * @param savedDarkMode - chrome.storage.local に保存されていた設定値
   * @returns なし
   */
  const initTheme = (savedDarkMode?: boolean | unknown): void => {
    const isDark =
      typeof savedDarkMode === "boolean"
        ? savedDarkMode
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(isDark);
  };

  /**
   * ダークモードとライトモードの表示テーマを切り替える関数
   * @returns なし
   */
  const toggleDarkMode = (): void => {
    const nextValue = !isDarkMode.value;
    applyTheme(nextValue);
    void chrome.storage.local.set({ darkMode: nextValue });
  };

  return {
    isDarkMode,
    initTheme,
    toggleDarkMode,
  };
};
