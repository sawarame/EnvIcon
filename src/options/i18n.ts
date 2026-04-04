/**
 * 言語ごとの翻訳設定
 */
export const i18nConfig = {
  en: {
    title: "Favicon Replacement Settings",
    enableFavicon: "Enable environment-specific favicon replacement",
    addHostname: "Add Hostname",
    remove: "Remove",
    regex: "Regex",
    save: "Save",
    saved: "Sync settings saved.",
    errorInvalid: "Error: Invalid URL, hostname, or regex found.",
    errorDuplicate: "Error: Duplicate hostnames or regex patterns found.",
    badgeTextLabel: "Badge Text",
    badgeColorLabel: "Color",
    badgeOutlineColorLabel: "Outline",
    resetDefault: "Reset to default",
    addEnvironment: "+ Add Environment",
    deleteEnvironment: "Delete",
    newEnvPrompt: "Enter a name for the new environment:",
    newEnvCancel: "Cancelled: no environment name was entered.",
    ProductionName: "Production Environment",
    StagingName: "Staging Environment",
    DevelopmentName: "Development Environment",
  },
  ja: {
    title: "Favicon書き換え設定",
    enableFavicon: "環境ごとのFavicon書き換えを有効にする",
    addHostname: "ホスト名を追加",
    remove: "削除",
    regex: "正規表現",
    save: "保存",
    saved: "設定を保存しました。",
    errorInvalid: "エラー: 無効なURL、ホスト名、または正規表現が含まれています。",
    errorDuplicate: "エラー: 重複するホスト名または正規表現パターンが含まれています。",
    badgeTextLabel: "バッジ文字",
    badgeColorLabel: "色",
    badgeOutlineColorLabel: "フチ色",
    resetDefault: "デフォルトに戻す",
    addEnvironment: "+ 環境追加",
    deleteEnvironment: "環境を削除",
    newEnvPrompt: "新しい環境名を入力してください:",
    newEnvCancel: "キャンセルされました。",
    ProductionName: "本番環境（Production）",
    StagingName: "ステージング環境（Staging）",
    DevelopmentName: "開発環境（Development）",
  },
};

/** 対応言語の型定義 */
export type Language = "en" | "ja";

/** 現在選択されている言語 */
export let currentLanguage: Language = "en";

/**
 * 現在の言語を設定する
 * @param lang 設定する言語 ("en" | "ja")
 */
export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
};

/**
 * 指定されたキーに対応する翻訳テキストを取得する
 * @param key 翻訳キー
 * @returns 翻訳された文字列
 */
export const t = (key: keyof typeof i18nConfig["en"]): string =>
  i18nConfig[currentLanguage][key];

/**
 * HTML内の data-i18n 属性を持つ要素に対して翻訳を適用する
 */
export const applyTranslations = () => {
  const dict = i18nConfig[currentLanguage];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n") as keyof typeof dict;
    if (dict[key]) el.textContent = dict[key];
  });
};
