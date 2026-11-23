import { ref } from 'vue';

/**
 * 英語の基準翻訳辞書（すべての対応言語で同一キーを持つことを型で保証する）
 */
const enMessages = {
  enableFavicon: "Enable favicon replacement",
  enableFaviconPerEnv: "Enable favicon replacement",
  enablePageBadgePerEnv: "Display badge on page",
  enableConsoleLogPerEnv: "Display environment in DevTools console",
  remove: "Remove",
  regex: "Regex",
  patternEnabled: "Enabled",
  save: "Save",
  saved: "Sync settings saved.",
  saving: "Saving...",
  allSaved: "All changes automatically saved",
  saveError: "Some inputs are invalid; changes not saved",
  errorInvalid: "Error: Invalid URL pattern, hostname, port, or regex found.",
  errorDuplicate: "Error: Duplicate URL patterns or regex patterns found.",
  errorTitle: "Error",
  successTitle: "Success",
  featuresTitle: "Features",
  badgeSettings: "Appearance",
  pageBadgeSettings: "Badge Options",
  hostnamePatterns: "URL / Hostname Patterns",
  addEnvironmentPattern: "Add URL Pattern",
  badgeTextLabel: "Badge Text",
  badgeColorLabel: "Color",
  badgeOutlineColorLabel: "Outline",
  undoChanges: "Undo changes",
  addEnvironment: "Add Environment",
  deleteEnvironment: "Delete",
  dragHandle: "Drag to reorder",
  useRegex: "Use Regular Expression",
  placeholderHostname: "e.g. example.com, localhost:3000, example.com/stg",
  placeholderRegex: "e.g. ^.*\\.local$ or ^localhost:300[0-9]/admin",
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
  tourHostnameTitle: "Set URL Patterns",
  tourHostnameMsg: "Enter the hostname, port, or path for your environment (e.g., 'example.com', 'localhost:3000', or 'example.com/stg'). This triggers the badge display.",
  tourBadgeTitle: "Customize Badges",
  tourBadgeMsg: "You can change the badge text (up to 4 chars) and colors. Try making Production more noticeable!",
  tourCheckerTitle: "Test Your Settings",
  tourCheckerMsg: "Use the URL Checker to verify if a specific URL matches your settings before visiting the site.",
  tourAddEnvTitle: "Add Custom Environments",
  tourAddEnvMsg: "You can click here to add as many custom environments as you need, in addition to the default ones.",
  tourSaveTitle: "Auto-Save",
  tourSaveMsg: "Changes are automatically saved as you make them. No need to click a save button!",
  tourFinalTitle: "One More Thing...",
  tourFinalMsg: "Click the extension icon in your toolbar anytime for quick site assignment, temporary pause, or to open this settings page. Enjoy!",
  tourNext: "Next",
  tourPrev: "Back",
  tourFinish: "Done",
  exportSettings: "Export Settings",
  importSettings: "Import Settings",
  importError: "Error: Invalid settings format.",
  importSuccess: "Settings imported successfully.",
  importConfirmTitle: "Import Settings",
  importConfirmMessage: "Are you sure you want to import settings? This will overwrite all your current environment configurations.",
  changeLanguage: "Change Language",
  languageAuto: "Browser Language (Auto)",
  darkMode: "Dark Mode",
  lightMode: "Light Mode",
  deleteConfirmTitle: "Delete Environment",
  deleteConfirmMessage: "Are you sure you want to delete this environment?",
  confirmYes: "Yes, Delete",
  confirmNo: "Cancel",
  confirmImport: "Import",
  popupOpenSettings: "Open Settings",
  popupGlobalToggleTitle: "Enable or pause EnvIcon on all sites",
  popupGlobalDisabledBanner: "Paused on all sites (auto-resumes on browser restart)",
  popupCurrentSite: "Current Site",
  popupUnsupportedPage: "EnvIcon is not available on this page.",
  popupSiteMuteLabel: "Temporarily pause on this site",
  popupSiteMuteHint: "Auto-resumes when browser closes",
  popupStatusUnassigned: "Unassigned",
  popupStatusPaused: "Paused",
  popupAssignEnvTitle: "Environment Assignment",
  popupUnassign: "Remove",
  popupAssignHint: "Click to assign, click active item to remove",
  popupRegexLockedMsg: "Matched via regex pattern. Edit or remove it in Settings.",
  popupPatternLockedMsg: "Matched via path or broad host pattern. Edit or remove it in Settings.",
  popupRegexPatternLabel: "Pattern:",
  optionsGlobalPausedNotice: "EnvIcon is currently paused on all sites (resets when browser closes).",
  optionsResumeNow: "Resume Now",
  saveErrorDetailsTitle: "Reasons changes cannot be saved",
  unnamedEnvironment: "(Unnamed Environment)",
  validationEmptyName: "Environment name is required",
  validationInvalidBadgeColor: 'Badge "Color" is not a valid hex color code (e.g. #ff0000)',
  validationInvalidBadgeOutlineColor: 'Badge "Outline" is not a valid hex color code (e.g. #ffffff)',
  validationInvalidFontSize: 'Page badge "Font Size" is out of valid range',
  validationInvalidUrlPattern: 'URL pattern "{pattern}" is invalid',
  validationInvalidRegexPattern: 'Regex pattern "{pattern}" has a syntax error',
  validationDuplicateSameEnv: 'Pattern "{pattern}" is duplicated within the same environment',
  validationDuplicateOtherEnv: 'Pattern "{pattern}" duplicates a pattern in "{targetEnv}"',
  tabUrlPatterns: "URL Patterns",
  tabBadgeAndFeatures: "Badge & Display",
  urlPatternsHint: "You can specify port numbers (:3000) and paths (/stg) in addition to hostnames.",
  rulesCountSingular: "{count} rule",
  rulesCountPlural: "{count} rules",
} as const;

/** 対応する表示言語の型定義 */
export type Language = "en" | "ja" | "zh-CN" | "zh-TW" | "ko";

/** ストレージに保存する言語設定値の型定義（"auto" はブラウザ言語自動追従） */
export type LanguageSetting = "auto" | Language;

/** 翻訳キーの型定義 */
export type TranslationKey = keyof typeof enMessages;

/** 対応している表示言語コード一覧 */
export const SUPPORTED_LANGUAGES: readonly Language[] = [
  "en",
  "ja",
  "zh-CN",
  "zh-TW",
  "ko",
] as const;

/** 言語切り替えメニューで表示する各言語のネイティブ表記定義 */
export const LANGUAGE_OPTIONS: readonly {
  /** 表示言語コード */
  code: Language;
  /** 各言語でのネイティブ表記名 */
  nativeLabel: string;
}[] = [
  { code: "en", nativeLabel: "English" },
  { code: "ja", nativeLabel: "日本語" },
  { code: "zh-CN", nativeLabel: "简体中文" },
  { code: "zh-TW", nativeLabel: "繁體中文" },
  { code: "ko", nativeLabel: "한국어" },
] as const;

/**
 * 言語ごとの翻訳設定
 */
export const i18nConfig: Record<Language, Record<TranslationKey, string>> = {
  en: enMessages,
  ja: {
    enableFavicon: "Favicon書き換えを有効にする",
    enableFaviconPerEnv: "Favicon書き換えを有効にする",
    enablePageBadgePerEnv: "ページ内にバッジを表示する",
    enableConsoleLogPerEnv: "開発者ツール（コンソール）に環境を表示する",
    remove: "削除",
    regex: "正規表現",
    patternEnabled: "有効",
    save: "保存",
    saved: "設定を保存しました。",
    saving: "保存中...",
    allSaved: "すべての変更を自動保存しました",
    saveError: "入力内容に不備があるため保存されていません",
    errorInvalid: "エラー: 無効なURLパターン、ホスト名、ポート番号、または正規表現が含まれています。",
    errorDuplicate: "エラー: 重複するURLパターンまたは正規表現パターンが含まれています。",
    errorTitle: "エラー",
    successTitle: "成功",
    featuresTitle: "機能設定",
    badgeSettings: "バッジ設定",
    pageBadgeSettings: "ページ内表示設定",
    hostnamePatterns: "URL・ホスト名のパターン設定",
    addEnvironmentPattern: "+ URLパターンを追加",
    badgeTextLabel: "バッジ文字",
    badgeColorLabel: "色",
    badgeOutlineColorLabel: "フチ色",
    undoChanges: "編集内容を取り消す",
    addEnvironment: "環境追加",
    deleteEnvironment: "環境を削除",
    dragHandle: "ドラッグして順序を入れ替え",
    useRegex: "正規表現を使用する",
    placeholderHostname: "例: example.com, localhost:3000, example.com/stg",
    placeholderRegex: "例: ^.*\\.local$ や ^localhost:300[0-9]/admin",
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
    tourHostnameTitle: "URLパターンの設定",
    tourHostnameMsg: "環境に対応するホスト名・ポート・パス（例: 'example.com'、'localhost:3000'、'example.com/stg'）を入力します。これがバッジ表示のトリガーになります。",
    tourBadgeTitle: "バッジのカスタマイズ",
    tourBadgeMsg: "バッジの文字（4文字以内）や色は自由に変えられます。本番環境を目立つ色にするのがおすすめです！",
    tourCheckerTitle: "設定をテスト",
    tourCheckerMsg: "URLチェッカーを使えば、実際にサイトを開く前に設定が正しく動作するか確認できます。",
    tourAddEnvTitle: "カスタム環境を追加",
    tourAddEnvMsg: "本番・ステージング・開発環境の他にも、必要なだけ環境を追加することができます。",
    tourSaveTitle: "自動保存",
    tourSaveMsg: "設定を変更すると自動的に保存されます。保存ボタンを押す必要はありません！",
    tourFinalTitle: "最後に",
    tourFinalMsg: "ツールバーのアイコンをクリックすると、サイトのワンクリック登録や一時OFF、この設定画面の呼び出しがいつでも行えます。ぜひ活用してください！",
    tourNext: "次へ",
    tourPrev: "戻る",
    tourFinish: "完了",
    exportSettings: "設定をエクスポート",
    importSettings: "設定をインポート",
    importError: "エラー: 読み込んだファイルは不正なフォーマットです。",
    importSuccess: "設定をインポートしました。",
    importConfirmTitle: "設定のインポート（データ移行）",
    importConfirmMessage: "設定ファイルをインポートしてもよろしいですか？現在のすべての環境設定が上書きされます。",
    changeLanguage: "言語切り替え",
    languageAuto: "ブラウザの言語（自動）",
    darkMode: "ダークモード",
    lightMode: "ライトモード",
    deleteConfirmTitle: "環境の削除",
    deleteConfirmMessage: "この環境を削除してもよろしいですか？",
    confirmYes: "削除する",
    confirmNo: "キャンセル",
    confirmImport: "インポートする",
    popupOpenSettings: "設定画面を開く",
    popupGlobalToggleTitle: "すべてのサイトで EnvIcon を有効化 / 一時OFF",
    popupGlobalDisabledBanner: "すべてのサイトで一時OFF中です（ブラウザ再起動で自動復帰）",
    popupCurrentSite: "現在のサイト",
    popupUnsupportedPage: "このページでは拡張機能を利用できません。",
    popupSiteMuteLabel: "このサイトを一時OFF",
    popupSiteMuteHint: "ブラウザを閉じると自動でONに戻ります",
    popupStatusUnassigned: "未登録",
    popupStatusPaused: "一時OFF中",
    popupAssignEnvTitle: "環境の割り当て",
    popupUnassign: "登録解除",
    popupAssignHint: "クリックで即割り当て・選択中の環境を再クリックで解除",
    popupRegexLockedMsg: "正規表現パターンで一致中のため、変更・解除は設定画面から行ってください。",
    popupPatternLockedMsg: "パス指定または広域ホストパターンで一致中のため、変更・解除は設定画面から行ってください。",
    popupRegexPatternLabel: "一致パターン:",
    optionsGlobalPausedNotice: "現在、すべてのサイトで一時OFFが有効になっています（ブラウザ再起動で自動復帰）。",
    optionsResumeNow: "今すぐONに戻す",
    saveErrorDetailsTitle: "保存できない理由",
    unnamedEnvironment: "（名称未設定の環境）",
    validationEmptyName: "環境名が入力されていません",
    validationInvalidBadgeColor: "バッジの「色」が正しいカラーコード形式（例: #ff0000）ではありません",
    validationInvalidBadgeOutlineColor: "バッジの「フチ色」が正しいカラーコード形式（例: #ffffff）ではありません",
    validationInvalidFontSize: "ページ内バッジの「文字サイズ」が有効範囲外です",
    validationInvalidUrlPattern: "URLパターン「{pattern}」の形式が無効です",
    validationInvalidRegexPattern: "正規表現パターン「{pattern}」に構文エラーがあります",
    validationDuplicateSameEnv: "パターン「{pattern}」が同じ環境内で重複しています",
    validationDuplicateOtherEnv: "パターン「{pattern}」が「{targetEnv}」と重複しています",
    tabUrlPatterns: "URLパターン",
    tabBadgeAndFeatures: "デザイン・表示設定",
    urlPatternsHint: "ホスト名に加え、ポート番号（:3000）やパス（/stg）も指定可能です。",
    rulesCountSingular: "{count} 件のルール",
    rulesCountPlural: "{count} 件のルール",
  },
  "zh-CN": {
    enableFavicon: "启用网站图标（Favicon）替换",
    enableFaviconPerEnv: "启用网站图标（Favicon）替换",
    enablePageBadgePerEnv: "在页面内显示徽章",
    enableConsoleLogPerEnv: "在开发者工具控制台中显示环境信息",
    remove: "删除",
    regex: "正则",
    patternEnabled: "启用",
    save: "保存",
    saved: "同步设置已保存。",
    saving: "正在保存...",
    allSaved: "所有更改已自动保存",
    saveError: "存在无效输入，更改尚未保存",
    errorInvalid: "错误：包含无效的 URL 规则、主机名、端口号或正则表达式。",
    errorDuplicate: "错误：存在重复的 URL 规则或正则表达式。",
    errorTitle: "错误",
    successTitle: "成功",
    featuresTitle: "功能设置",
    badgeSettings: "徽章外观",
    pageBadgeSettings: "页面徽章选项",
    hostnamePatterns: "URL / 主机名规则",
    addEnvironmentPattern: "+ 添加 URL 规则",
    badgeTextLabel: "徽章文字",
    badgeColorLabel: "文字颜色",
    badgeOutlineColorLabel: "描边颜色",
    undoChanges: "撤销更改",
    addEnvironment: "添加环境",
    deleteEnvironment: "删除环境",
    dragHandle: "拖动以调整顺序",
    useRegex: "使用正则表达式",
    placeholderHostname: "例如：example.com、localhost:3000、example.com/stg",
    placeholderRegex: "例如：^.*\\.local$ 或 ^localhost:300[0-9]/admin",
    newEnvPrompt: "请输入新环境的名称：",
    newEnvCancel: "已取消：未输入环境名称。",
    newEnvDefaultName: "新环境",
    ProductionName: "生产环境（Production）",
    StagingName: "预发布环境（Staging）",
    DevelopmentName: "开发环境（Development）",
    urlCheckerTitle: "URL 检测器",
    urlCheckerDescription: "测试指定 URL 会匹配到哪一个环境设置。输入 URL 后，将显示对应应用的环境徽章。",
    urlCheckerPlaceholder: "输入要检测的 URL（例如：https://example.com/page）",
    urlCheckerMatched: "已匹配：",
    urlCheckerNotMatched: "未匹配任何环境",
    enablePageBadge: "在页面内显示固定徽章",
    pageBadgePosition: "徽章位置",
    pageBadgeFontSize: "字体大小",
    badgePosTopLeft: "左上角",
    badgePosTopRight: "右上角",
    badgePosBottomLeft: "左下角",
    badgePosBottomRight: "右下角",
    tourWelcomeTitle: "欢迎使用 EnvIcon！",
    tourWelcomeMsg: "让我们为开发、预发布和生产环境配置专属网站图标徽章，助您一目了然地区分不同环境。",
    tourHostnameTitle: "设置 URL 规则",
    tourHostnameMsg: "输入对应环境的主机名、端口或路径（例如：'example.com'、'localhost:3000'、'example.com/stg'），访问匹配页面时即会触发徽章显示。",
    tourBadgeTitle: "自定义徽章外观",
    tourBadgeMsg: "您可以自由修改徽章文字（最多 4 个字符）和颜色。建议将生产环境设置为更醒目的颜色！",
    tourCheckerTitle: "测试您的配置",
    tourCheckerMsg: "使用 URL 检测器，在实际打开网站前即可验证您的规则是否按预期生效。",
    tourAddEnvTitle: "添加自定义环境",
    tourAddEnvMsg: "除默认环境外，您可以点击此处按需添加任意数量的自定义环境。",
    tourSaveTitle: "自动保存",
    tourSaveMsg: "修改设置后会自动保存，无需手动点击保存按钮！",
    tourFinalTitle: "最后一步",
    tourFinalMsg: "随时点击浏览器工具栏中的扩展图标，即可快速分配当前站点、临时暂停或打开此设置页面。祝您使用愉快！",
    tourNext: "下一步",
    tourPrev: "上一步",
    tourFinish: "完成",
    exportSettings: "导出设置",
    importSettings: "导入设置",
    importError: "错误：设置文件格式无效。",
    importSuccess: "设置导入成功。",
    importConfirmTitle: "导入设置",
    importConfirmMessage: "确定要导入设置吗？此操作将覆盖当前所有的环境配置。",
    changeLanguage: "切换语言",
    languageAuto: "浏览器语言（自动）",
    darkMode: "深色模式",
    lightMode: "浅色模式",
    deleteConfirmTitle: "删除环境",
    deleteConfirmMessage: "确定要删除此环境吗？",
    confirmYes: "确认删除",
    confirmNo: "取消",
    confirmImport: "导入",
    popupOpenSettings: "打开设置页面",
    popupGlobalToggleTitle: "在所有网站上启用或临时暂停 EnvIcon",
    popupGlobalDisabledBanner: "已在所有网站上临时暂停（重启浏览器后自动恢复）",
    popupCurrentSite: "当前网站",
    popupUnsupportedPage: "当前页面不支持使用 EnvIcon。",
    popupSiteMuteLabel: "在此网站上临时暂停",
    popupSiteMuteHint: "关闭浏览器后将自动恢复启用",
    popupStatusUnassigned: "未分配",
    popupStatusPaused: "已暂停",
    popupAssignEnvTitle: "环境分配",
    popupUnassign: "取消分配",
    popupAssignHint: "点击立即分配，再次点击当前环境可取消",
    popupRegexLockedMsg: "当前通过正则表达式规则匹配，请前往设置页面编辑或移除。",
    popupPatternLockedMsg: "当前通过路径或广域主机规则匹配，请前往设置页面编辑或移除。",
    popupRegexPatternLabel: "匹配规则：",
    optionsGlobalPausedNotice: "EnvIcon 当前已在所有网站上临时暂停（重启浏览器后自动恢复）。",
    optionsResumeNow: "立即恢复启用",
    saveErrorDetailsTitle: "无法保存的原因",
    unnamedEnvironment: "（未命名环境）",
    validationEmptyName: "请输入环境名称",
    validationInvalidBadgeColor: "徽章「文字颜色」不是有效的十六进制颜色代码（例如：#ff0000）",
    validationInvalidBadgeOutlineColor: "徽章「描边颜色」不是有效的十六进制颜色代码（例如：#ffffff）",
    validationInvalidFontSize: "页面徽章「字体大小」超出有效范围",
    validationInvalidUrlPattern: "URL 规则「{pattern}」格式无效",
    validationInvalidRegexPattern: "正则表达式「{pattern}」存在语法错误",
    validationDuplicateSameEnv: "规则「{pattern}」在同一环境内重复",
    validationDuplicateOtherEnv: "规则「{pattern}」与「{targetEnv}」中的规则重复",
    tabUrlPatterns: "URL 规则",
    tabBadgeAndFeatures: "徽章与显示设置",
    urlPatternsHint: "除主机名外，还可指定端口号（:3000）和路径（/stg）。",
    rulesCountSingular: "{count} 条规则",
    rulesCountPlural: "{count} 条规则",
  },
  "zh-TW": {
    enableFavicon: "啟用網站圖示（Favicon）替換",
    enableFaviconPerEnv: "啟用網站圖示（Favicon）替換",
    enablePageBadgePerEnv: "在頁面內顯示徽章",
    enableConsoleLogPerEnv: "在開發者工具主控台顯示環境資訊",
    remove: "刪除",
    regex: "正則",
    patternEnabled: "啟用",
    save: "儲存",
    saved: "同步設定已儲存。",
    saving: "正在儲存...",
    allSaved: "所有變更已自動儲存",
    saveError: "部分輸入內容有誤，變更尚未儲存",
    errorInvalid: "錯誤：包含無效的 URL 規則、主機名稱、連接埠號或正規表示式。",
    errorDuplicate: "錯誤：包含重複的 URL 規則或正規表示式。",
    errorTitle: "錯誤",
    successTitle: "成功",
    featuresTitle: "功能設定",
    badgeSettings: "徽章外觀",
    pageBadgeSettings: "頁面徽章選項",
    hostnamePatterns: "URL / 主機名稱規則",
    addEnvironmentPattern: "+ 新增 URL 規則",
    badgeTextLabel: "徽章文字",
    badgeColorLabel: "文字顏色",
    badgeOutlineColorLabel: "外框顏色",
    undoChanges: "復原變更",
    addEnvironment: "新增環境",
    deleteEnvironment: "刪除環境",
    dragHandle: "拖曳以調整順序",
    useRegex: "使用正規表示式",
    placeholderHostname: "例如：example.com、localhost:3000、example.com/stg",
    placeholderRegex: "例如：^.*\\.local$ 或 ^localhost:300[0-9]/admin",
    newEnvPrompt: "請輸入新環境的名稱：",
    newEnvCancel: "已取消：未輸入環境名稱。",
    newEnvDefaultName: "新環境",
    ProductionName: "正式環境（Production）",
    StagingName: "預發佈環境（Staging）",
    DevelopmentName: "開發環境（Development）",
    urlCheckerTitle: "URL 檢測工具",
    urlCheckerDescription: "測試指定 URL 會符合哪一個環境設定。輸入 URL 後，將顯示對應套用的環境徽章。",
    urlCheckerPlaceholder: "輸入要檢測的 URL（例如：https://example.com/page）",
    urlCheckerMatched: "符合項目：",
    urlCheckerNotMatched: "未符合任何環境",
    enablePageBadge: "在頁面內顯示固定徽章",
    pageBadgePosition: "徽章位置",
    pageBadgeFontSize: "字體大小",
    badgePosTopLeft: "左上角",
    badgePosTopRight: "右上角",
    badgePosBottomLeft: "左下角",
    badgePosBottomRight: "右下角",
    tourWelcomeTitle: "歡迎使用 EnvIcon！",
    tourWelcomeMsg: "讓我們為開發、預發佈和正式環境設定專屬網站圖示徽章，讓您一眼就能辨識不同環境。",
    tourHostnameTitle: "設定 URL 規則",
    tourHostnameMsg: "輸入對應環境的主機名稱、連接埠或路徑（例如：'example.com'、'localhost:3000'、'example.com/stg'），造訪符合頁面時便會顯示徽章。",
    tourBadgeTitle: "自訂徽章外觀",
    tourBadgeMsg: "您可以自由調整徽章文字（最多 4 個字元）與顏色。建議將正式環境設為更醒目的配色！",
    tourCheckerTitle: "測試您的設定",
    tourCheckerMsg: "使用 URL 檢測工具，在實際開啟網站前就能確認規則是否如預期運作。",
    tourAddEnvTitle: "新增自訂環境",
    tourAddEnvMsg: "除了預設環境之外，您可以點擊此處依需求新增任意數量的自訂環境。",
    tourSaveTitle: "自動儲存",
    tourSaveMsg: "變更設定後會自動儲存，無須手動點擊儲存按鈕！",
    tourFinalTitle: "最後提醒",
    tourFinalMsg: "隨時點擊瀏覽器工具列上的擴充功能圖示，即可快速指派目前網站、暫時停用或開啟此設定頁面。祝使用愉快！",
    tourNext: "下一步",
    tourPrev: "上一步",
    tourFinish: "完成",
    exportSettings: "匯出設定",
    importSettings: "匯入設定",
    importError: "錯誤：設定檔案格式無效。",
    importSuccess: "設定匯入成功。",
    importConfirmTitle: "匯入設定",
    importConfirmMessage: "確定要匯入設定嗎？此操作將覆寫目前所有的環境設定。",
    changeLanguage: "切換語言",
    languageAuto: "瀏覽器語言（自動）",
    darkMode: "深色模式",
    lightMode: "淺色模式",
    deleteConfirmTitle: "刪除環境",
    deleteConfirmMessage: "確定要刪除此環境嗎？",
    confirmYes: "確認刪除",
    confirmNo: "取消",
    confirmImport: "匯入",
    popupOpenSettings: "開啟設定頁面",
    popupGlobalToggleTitle: "在所有網站上啟用或暫時停用 EnvIcon",
    popupGlobalDisabledBanner: "已在所有網站上暫時停用（重新啟動瀏覽器後自動恢復）",
    popupCurrentSite: "目前網站",
    popupUnsupportedPage: "此頁面無法使用 EnvIcon。",
    popupSiteMuteLabel: "在此網站上暫時停用",
    popupSiteMuteHint: "關閉瀏覽器後將自動恢復啟用",
    popupStatusUnassigned: "未指派",
    popupStatusPaused: "已暫停",
    popupAssignEnvTitle: "環境指派",
    popupUnassign: "取消指派",
    popupAssignHint: "點擊立即指派，再次點擊目前環境可取消",
    popupRegexLockedMsg: "目前由正規表示式規則符合，請前往設定頁面編輯或移除。",
    popupPatternLockedMsg: "目前由路徑或廣域主機規則符合，請前往設定頁面編輯或移除。",
    popupRegexPatternLabel: "符合規則：",
    optionsGlobalPausedNotice: "EnvIcon 目前已在所有網站上暫時停用（重新啟動瀏覽器後自動恢復）。",
    optionsResumeNow: "立即恢復啟用",
    saveErrorDetailsTitle: "無法儲存的原因",
    unnamedEnvironment: "（未命名環境）",
    validationEmptyName: "請輸入環境名稱",
    validationInvalidBadgeColor: "徽章「文字顏色」不是有效的十六進位色碼（例如：#ff0000）",
    validationInvalidBadgeOutlineColor: "徽章「外框顏色」不是有效的十六進位色碼（例如：#ffffff）",
    validationInvalidFontSize: "頁面徽章「字體大小」超出有效範圍",
    validationInvalidUrlPattern: "URL 規則「{pattern}」格式無效",
    validationInvalidRegexPattern: "正規表示式「{pattern}」有語法錯誤",
    validationDuplicateSameEnv: "規則「{pattern}」在同一環境內重複",
    validationDuplicateOtherEnv: "規則「{pattern}」與「{targetEnv}」中的規則重複",
    tabUrlPatterns: "URL 規則",
    tabBadgeAndFeatures: "徽章與顯示設定",
    urlPatternsHint: "除了主機名稱外，亦可指定連接埠號（:3000）與路徑（/stg）。",
    rulesCountSingular: "{count} 條規則",
    rulesCountPlural: "{count} 條規則",
  },
  ko: {
    enableFavicon: "파비콘(Favicon) 교체 사용",
    enableFaviconPerEnv: "파비콘(Favicon) 교체 사용",
    enablePageBadgePerEnv: "페이지 내 배지 표시",
    enableConsoleLogPerEnv: "개발자 도구 콘솔에 환경 표시",
    remove: "삭제",
    regex: "정규식",
    patternEnabled: "사용",
    save: "저장",
    saved: "동기화 설정이 저장되었습니다.",
    saving: "저장 중...",
    allSaved: "모든 변경 사항이 자동 저장되었습니다",
    saveError: "잘못된 입력이 있어 변경 사항이 저장되지 않았습니다",
    errorInvalid: "오류: 유효하지 않은 URL 패턴, 호스트명, 포트 번호 또는 정규식이 포함되어 있습니다.",
    errorDuplicate: "오류: 중복된 URL 패턴 또는 정규식이 포함되어 있습니다.",
    errorTitle: "오류",
    successTitle: "성공",
    featuresTitle: "기능 설정",
    badgeSettings: "배지 디자인",
    pageBadgeSettings: "페이지 배지 옵션",
    hostnamePatterns: "URL / 호스트명 패턴",
    addEnvironmentPattern: "+ URL 패턴 추가",
    badgeTextLabel: "배지 텍스트",
    badgeColorLabel: "글자 색",
    badgeOutlineColorLabel: "테두리 색",
    undoChanges: "변경 취소",
    addEnvironment: "환경 추가",
    deleteEnvironment: "환경 삭제",
    dragHandle: "드래그하여 순서 변경",
    useRegex: "정규표현식 사용",
    placeholderHostname: "예: example.com, localhost:3000, example.com/stg",
    placeholderRegex: "예: ^.*\\.local$ 또는 ^localhost:300[0-9]/admin",
    newEnvPrompt: "새 환경 이름을 입력하세요:",
    newEnvCancel: "취소되었습니다: 환경 이름이 입력되지 않았습니다.",
    newEnvDefaultName: "새 환경",
    ProductionName: "운영 환경 (Production)",
    StagingName: "스테이징 환경 (Staging)",
    DevelopmentName: "개발 환경 (Development)",
    urlCheckerTitle: "URL 검사기",
    urlCheckerDescription: "입력한 URL이 현재 설정에서 어떤 환경으로 판별되는지 테스트할 수 있습니다. URL을 입력하면 적용될 환경 배지가 표시됩니다.",
    urlCheckerPlaceholder: "검사할 URL 입력 (예: https://example.com/page)",
    urlCheckerMatched: "일치:",
    urlCheckerNotMatched: "일치하는 환경이 없습니다",
    enablePageBadge: "페이지 내 고정 배지 표시",
    pageBadgePosition: "배지 위치",
    pageBadgeFontSize: "글꼴 크기",
    badgePosTopLeft: "왼쪽 상단",
    badgePosTopRight: "오른쪽 상단",
    badgePosBottomLeft: "왼쪽 하단",
    badgePosBottomRight: "오른쪽 하단",
    tourWelcomeTitle: "EnvIcon에 오신 것을 환영합니다!",
    tourWelcomeMsg: "개발·스테이징·운영 환경을 한눈에 구분할 수 있도록 환경별 파비콘 배지를 설정해 보세요.",
    tourHostnameTitle: "URL 패턴 설정",
    tourHostnameMsg: "환경에 해당하는 호스트명, 포트 또는 경로(예: 'example.com', 'localhost:3000', 'example.com/stg')를 입력하세요. 일치하는 사이트에서 배지가 표시됩니다.",
    tourBadgeTitle: "배지 사용자 지정",
    tourBadgeMsg: "배지 텍스트(최대 4자)와 색상을 자유롭게 변경할 수 있습니다. 운영 환경은 눈에 띄는 색상으로 설정해 보세요!",
    tourCheckerTitle: "설정 테스트",
    tourCheckerMsg: "URL 검사기를 사용하면 사이트를 직접 열기 전에 설정이 올바르게 동작하는지 확인할 수 있습니다.",
    tourAddEnvTitle: "사용자 지정 환경 추가",
    tourAddEnvMsg: "기본 환경 외에도 여기를 클릭하여 필요한 만큼 사용자 지정 환경을 추가할 수 있습니다.",
    tourSaveTitle: "자동 저장",
    tourSaveMsg: "설정을 변경하면 자동으로 저장됩니다. 별도로 저장 버튼을 누를 필요가 없습니다!",
    tourFinalTitle: "마지막으로",
    tourFinalMsg: "도구 모음의 확장 프로그램 아이콘을 클릭하면 언제든지 빠른 사이트 할당, 일시 중지 또는 이 설정 페이지 열기를 이용할 수 있습니다!",
    tourNext: "다음",
    tourPrev: "이전",
    tourFinish: "완료",
    exportSettings: "설정 내보내기",
    importSettings: "설정 가져오기",
    importError: "오류: 설정 파일 형식이 올바르지 않습니다.",
    importSuccess: "설정을 성공적으로 가져왔습니다.",
    importConfirmTitle: "설정 가져오기",
    importConfirmMessage: "설정을 가져오시겠습니까? 현재의 모든 환경 설정을 덮어씁니다.",
    changeLanguage: "언어 변경",
    languageAuto: "브라우저 언어 (자동)",
    darkMode: "다크 모드",
    lightMode: "라이트 모드",
    deleteConfirmTitle: "환경 삭제",
    deleteConfirmMessage: "이 환경을 삭제하시겠습니까?",
    confirmYes: "삭제",
    confirmNo: "취소",
    confirmImport: "가져오기",
    popupOpenSettings: "설정 열기",
    popupGlobalToggleTitle: "모든 사이트에서 EnvIcon 활성화 또는 일시 중지",
    popupGlobalDisabledBanner: "모든 사이트에서 일시 중지됨 (브라우저 재시작 시 자동 복구)",
    popupCurrentSite: "현재 사이트",
    popupUnsupportedPage: "이 페이지에서는 EnvIcon을 사용할 수 없습니다.",
    popupSiteMuteLabel: "이 사이트에서 일시 중지",
    popupSiteMuteHint: "브라우저를 닫으면 자동으로 다시 활성화됩니다",
    popupStatusUnassigned: "미등록",
    popupStatusPaused: "일시 중지됨",
    popupAssignEnvTitle: "환경 할당",
    popupUnassign: "할당 해제",
    popupAssignHint: "클릭하여 바로 할당, 선택된 항목을 다시 클릭하면 해제됩니다",
    popupRegexLockedMsg: "정규식 패턴으로 일치되었습니다. 설정 페이지에서 편집하거나 삭제하세요.",
    popupPatternLockedMsg: "경로 또는 상위 호스트 패턴으로 일치되었습니다. 설정 페이지에서 편집하거나 삭제하세요.",
    popupRegexPatternLabel: "일치 패턴:",
    optionsGlobalPausedNotice: "현재 모든 사이트에서 EnvIcon이 일시 중지되어 있습니다 (브라우저 재시작 시 자동 복구).",
    optionsResumeNow: "지금 다시 켜기",
    saveErrorDetailsTitle: "저장할 수 없는 이유",
    unnamedEnvironment: "(이름 없는 환경)",
    validationEmptyName: "환경 이름을 입력해 주세요",
    validationInvalidBadgeColor: '배지 "글자 색"이 올바른 HEX 색상 코드 형식이 아닙니다 (예: #ff0000)',
    validationInvalidBadgeOutlineColor: '배지 "테두리 색"이 올바른 HEX 색상 코드 형식이 아닙니다 (예: #ffffff)',
    validationInvalidFontSize: '페이지 배지 "글꼴 크기"가 유효 범위를 벗어났습니다',
    validationInvalidUrlPattern: 'URL 패턴 "{pattern}"의 형식이 올바르지 않습니다',
    validationInvalidRegexPattern: '정규식 패턴 "{pattern}"에 구문 오류가 있습니다',
    validationDuplicateSameEnv: '패턴 "{pattern}"이(가) 같은 환경 내에서 중복됩니다',
    validationDuplicateOtherEnv: '패턴 "{pattern}"이(가) "{targetEnv}"의 패턴과 중복됩니다',
    tabUrlPatterns: "URL 패턴",
    tabBadgeAndFeatures: "배지 및 표시 설정",
    urlPatternsHint: "호스트명 외에도 포트 번호(:3000)와 경로(/stg)를 지정할 수 있습니다.",
    rulesCountSingular: "규칙 {count}개",
    rulesCountPlural: "규칙 {count}개",
  },
};

/** 現在適用されている表示言語 */
export const currentLanguage = ref<Language>("en");

/** 現在選択されている言語設定値（"auto" または固定言語コード） */
export const currentLanguageSetting = ref<LanguageSetting>("auto");

/**
 * 値が対応済みの表示言語コードであるかを判定する型ガード関数
 * @param value - 検証対象の値
 * @returns 対応する Language 型であれば true
 */
export const isLanguage = (value: unknown): value is Language => {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
};

/**
 * ストレージ等から取得した任意の値を安全な LanguageSetting 型へ正規化する関数
 * 未設定や不正な値はすべてブラウザ言語自動追従（"auto"）として扱う
 * @param value - 検証対象の言語設定値
 * @returns 正規化された LanguageSetting 値
 */
export const parseLanguageSetting = (value: unknown): LanguageSetting => {
  if (value === "auto") {
    return "auto";
  }
  return isLanguage(value) ? value : "auto";
};

/**
 * ロケール文字列（BCP-47 形式等）を対応する表示言語コードへ変換する純粋関数
 * @param rawLocale - ブラウザ等から取得したロケール文字列（例: "ja-JP", "zh_TW", "ko-KR"）
 * @returns 解決された表示言語コード（未対応言語の場合は "en"）
 */
export const mapLocaleToLanguage = (
  rawLocale: string | undefined | null
): Language => {
  if (!rawLocale) {
    return "en";
  }
  const normalized = rawLocale.trim().toLowerCase().replace(/_/g, "-");
  if (normalized === "ja" || normalized.startsWith("ja-")) {
    return "ja";
  }
  if (normalized === "ko" || normalized.startsWith("ko-")) {
    return "ko";
  }
  if (
    normalized === "zh-tw" ||
    normalized.startsWith("zh-tw-") ||
    normalized === "zh-hk" ||
    normalized.startsWith("zh-hk-") ||
    normalized === "zh-mo" ||
    normalized.startsWith("zh-mo-") ||
    normalized === "zh-hant" ||
    normalized.startsWith("zh-hant-") ||
    (normalized.startsWith("zh-") && normalized.includes("-hant"))
  ) {
    return "zh-TW";
  }
  if (normalized === "zh" || normalized.startsWith("zh-")) {
    return "zh-CN";
  }
  return "en";
};

/**
 * ブラウザの表示言語設定から対応する言語コードを自動判定する関数
 * @returns ブラウザ言語に対応する表示言語コード
 */
export const detectBrowserLanguage = (): Language => {
  const uiLang =
    typeof chrome !== "undefined" &&
    chrome.i18n &&
    typeof chrome.i18n.getUILanguage === "function"
      ? chrome.i18n.getUILanguage()
      : undefined;
  const browserLang =
    uiLang ||
    (typeof navigator !== "undefined" ? navigator.language : undefined) ||
    "en";
  return mapLocaleToLanguage(browserLang);
};

/**
 * 言語設定値（"auto" または固定言語コード）から実際に表示すべき言語コードを解決する関数
 * @param setting - chrome.storage.local 等から取得した言語設定値
 * @returns 解決された表示言語コード
 */
export const resolveLanguage = (setting: unknown): Language => {
  const parsed = parseLanguageSetting(setting);
  return parsed === "auto" ? detectBrowserLanguage() : parsed;
};

/**
 * 現在の表示言語を設定し、HTML の lang 属性を同期更新する関数
 * @param lang - 設定する表示言語コード
 * @returns なし
 */
export const setLanguage = (lang: Language): void => {
  currentLanguage.value = lang;
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = lang;
  }
};

/**
 * 言語設定値（"auto" または各言語コード）を状態・表示言語・HTML の lang 属性へ適用する関数
 * @param setting - 適用する言語設定値（未設定・不正値は "auto" 扱い）
 * @returns 実際に適用された表示言語コード
 */
export const applyLanguageSetting = (setting: unknown): Language => {
  const parsed = parseLanguageSetting(setting);
  currentLanguageSetting.value = parsed;
  const resolved = parsed === "auto" ? detectBrowserLanguage() : parsed;
  setLanguage(resolved);
  return resolved;
};

/**
 * 指定されたキーに対応する翻訳テキストを取得し、必要に応じてプレースホルダーを置換する関数
 * @param key - 翻訳キー
 * @param params - テンプレート内の {key} を置換するパラメータマップ（省略可）
 * @returns 現在の言語に対応する翻訳済み文字列
 */
export const t = (
  key: TranslationKey,
  params?: Record<string, string | number>
): string => {
  const template = i18nConfig[currentLanguage.value][key] || key;
  if (!params) {
    return template;
  }
  // ユーザー入力値に '$' 等の特殊文字が含まれていても安全にリテラル置換するため関数コールバックを使用する
  return template.replace(/\{(\w+)\}/g, (match, tokenKey: string) =>
    Object.prototype.hasOwnProperty.call(params, tokenKey)
      ? String(params[tokenKey])
      : match
  );
};
