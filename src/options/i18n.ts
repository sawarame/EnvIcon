import { ref } from 'vue';

/**
 * 言語ごとの翻訳設定
 */
export const i18nConfig = {
  en: {
    enableFavicon: "Enable environment-specific favicon replacement",
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
    dragHandle: "Drag to reorder",
    useRegex: "Use Regular Expression",
    placeholderHostname: "example.com",
    placeholderRegex: "e.g. ^.*\\.local$",
    newEnvPrompt: "Enter a name for the new environment:",
    newEnvCancel: "Cancelled: no environment name was entered.",
    newEnvDefaultName: "New Environment",
    ProductionName: "Production Environment",
    StagingName: "Staging Environment",
    DevelopmentName: "Development Environment",
    urlCheckerTitle: "URL Checker",
    urlCheckerPlaceholder: "Enter URL to check (e.g. https://example.com/page)",
    urlCheckerMatched: "Matched:",
    urlCheckerNotMatched: "Did not match any environment",
    enablePageBadge: "Display fixed badge on page",
    pageBadgePosition: "Badge Position",
    pageBadgeFontSize: "Font Size",
    badgePosTopLeft: "Top Left",
    badgePosTopRight: "Top Right",
    badgePosBottomLeft: "Bottom Left",
    badgePosBottomRight: "Bottom Right",
  },
  ja: {
    enableFavicon: "環境ごとのFavicon書き換えを有効にする",
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
    dragHandle: "ドラッグして順序を入れ替え",
    useRegex: "正規表現を使用する",
    placeholderHostname: "例: example.com",
    placeholderRegex: "例: ^.*\\.local$",
    newEnvPrompt: "新しい環境名を入力してください:",
    newEnvCancel: "キャンセルされました。",
    newEnvDefaultName: "新規環境",
    ProductionName: "本番環境（Production）",
    StagingName: "ステージング環境（Staging）",
    DevelopmentName: "開発環境（Development）",
    urlCheckerTitle: "URLチェッカー",
    urlCheckerPlaceholder: "検証するURLを入力 (例: https://example.com/page)",
    urlCheckerMatched: "一致しました:",
    urlCheckerNotMatched: "一致しませんでした",
    enablePageBadge: "ページ内にバッジを表示する",
    pageBadgePosition: "バッジ位置",
    pageBadgeFontSize: "文字サイズ",
    badgePosTopLeft: "左上",
    badgePosTopRight: "右上",
    badgePosBottomLeft: "左下",
    badgePosBottomRight: "右下",
  },
};

/** 対応言語の型定義 */
export type Language = "en" | "ja";

/** 現在選択されている言語 */
export const currentLanguage = ref<Language>("en");

/**
 * 現在の言語を設定する
 * @param lang 設定する言語 ("en" | "ja")
 */
export const setLanguage = (lang: Language) => {
  currentLanguage.value = lang;
};

/**
 * 指定されたキーに対応する翻訳テキストを取得する
 * @param key 翻訳キー
 * @returns 翻訳された文字列
 */
export const t = (key: keyof typeof i18nConfig["en"]): string =>
  i18nConfig[currentLanguage.value][key] || key;
