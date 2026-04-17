import { ref } from 'vue';

/**
 * 言語ごとの翻訳設定
 */
export const i18nConfig = {
  en: {
    enableFavicon: "Enable favicon replacement",
    enableFaviconPerEnv: "Enable favicon replacement",
    enablePageBadgePerEnv: "Display badge on page",
    remove: "Remove",
    regex: "Regex",
    save: "Save",
    saved: "Sync settings saved.",
    errorInvalid: "Error: Invalid URL, hostname, or regex found.",
    errorDuplicate: "Error: Duplicate hostnames or regex patterns found.",
    errorTitle: "Error",
    successTitle: "Success",
    featuresTitle: "Features",
    badgeSettings: "Appearance",
    pageBadgeSettings: "Badge Options",
    hostnamePatterns: "Hostname Patterns",
    addEnvironmentPattern: "Add Hostname Pattern",
    badgeTextLabel: "Badge Text",
    badgeColorLabel: "Color",
    badgeOutlineColorLabel: "Outline",
    resetDefault: "Reset to default",
    addEnvironment: "Add Environment",
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
    urlCheckerDescription: "Test if a URL matches any of your environment settings. Enter a URL below to see which environment badge would be applied.",
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
    tourWelcomeTitle: "Welcome to EnvIcon!",
    tourWelcomeMsg: "Let's set up environment-specific favicons to easily identify your development, staging, and production sites.",
    tourHostnameTitle: "Set Hostnames",
    tourHostnameMsg: "Enter the URL or hostname for your environment (e.g., 'example.com' or 'www.example.com'). This triggers the favicon change.",
    tourBadgeTitle: "Customize Badges",
    tourBadgeMsg: "You can change the badge text (up to 4 chars) and colors. Try making Production more noticeable!",
    tourCheckerTitle: "Test Your Settings",
    tourCheckerMsg: "Use the URL Checker to verify if a specific URL matches your settings before visiting the site.",
    tourSaveTitle: "Save & Finish",
    tourSaveMsg: "Don't forget to click Save! Once saved, your favicon will update automatically on matching sites.",
    tourNext: "Next",
    tourPrev: "Back",
    tourFinish: "Done",
  },
  ja: {
    enableFavicon: "Favicon書き換えを有効にする",
    enableFaviconPerEnv: "Favicon書き換えを有効にする",
    enablePageBadgePerEnv: "ページ内にバッジを表示する",
    remove: "削除",
    regex: "正規表現",
    save: "保存",
    saved: "設定を保存しました。",
    errorInvalid: "エラー: 無効なURL、ホスト名、または正規表現が含まれています。",
    errorDuplicate: "エラー: 重複するホスト名または正規表現パターンが含まれています。",
    errorTitle: "エラー",
    successTitle: "成功",
    featuresTitle: "機能設定",
    badgeSettings: "バッジ設定",
    pageBadgeSettings: "ページ内表示設定",
    hostnamePatterns: "ホスト名のパターン設定",
    addEnvironmentPattern: "+ ホスト名パターンを追加",
    badgeTextLabel: "バッジ文字",
    badgeColorLabel: "色",
    badgeOutlineColorLabel: "フチ色",
    resetDefault: "デフォルトに戻す",
    addEnvironment: "環境追加",
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
    urlCheckerDescription: "入力したURLが現在の設定でどの環境に判定されるかテストできます。URLを入力すると、適用されるバッジが表示されます。",
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
    tourWelcomeTitle: "EnvIconへようこそ！",
    tourWelcomeMsg: "開発・ステージング・本番環境をひと目で判別できるように、faviconの設定をしましょう。",
    tourHostnameTitle: "ホスト名の設定",
    tourHostnameMsg: "環境に対応するURL（例: 'example.com' や 'www.example.com'）を入力します。これがfavicon書き換えのトリガーになります。",
    tourBadgeTitle: "バッジのカスタマイズ",
    tourBadgeMsg: "バッジの文字（4文字以内）や色は自由に変えられます。本番環境を目立つ色にするのがおすすめです！",
    tourCheckerTitle: "設定をテスト",
    tourCheckerMsg: "URLチェッカーを使えば、実際にサイトを開く前に設定が正しく動作するか確認できます。",
    tourSaveTitle: "保存して完了",
    tourSaveMsg: "最後に「保存」ボタンを押すのを忘れずに！これで設定が反映されます。",
    tourNext: "次へ",
    tourPrev: "戻る",
    tourFinish: "完了",
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
