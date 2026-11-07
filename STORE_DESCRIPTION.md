# Store Description (Chrome Web Store)

This file contains the Chrome Web Store listing descriptions for EnvIcon. Copy and paste the plain-text body under each field heading directly into the Chrome Web Store Developer Dashboard.

## Japanese (日本語)

### **名前**
EnvIcon - 環境識別 & ファビコンバッジ表示ツール

### **短い説明**
本番・ステージング・開発などの環境を、Favicon・ページ内バッジ・ツールバーアイコンで視覚的に識別し、環境の取り違えによる誤操作を防ぐ開発者向け拡張機能です。

### **詳細説明**
💡 【 概要 】
EnvIcon は、本番（PROD）・ステージング（STG）・開発（DEV）など複数の環境を同時に開いて作業する開発者やQAエンジニア、運用担当者のための環境識別ツールです。
設定したURLパターン（ホスト名・ポート番号・パス・正規表現）に基づき、Favicon へのバッジ重ね合わせ、ページ内へのフローティングバッジ表示、ツールバーアイコンの書き換え、コンソールログ出力を動的に行い、環境の取り違えによる誤操作を未然に防ぎます。

🛠️ 【 主な機能 】
■ 4つの視覚インジケーターによる環境識別
・Favicon バッジ：開いているページの Favicon に環境ラベル（PROD, STG など最大4文字）を動的に重ねて表示します。多数のタブを開いていても接続先環境を一目で判別できます。
・ページ内フローティングバッジ：ページの四隅に半透明の環境バッジを固定表示します。クリックやテキスト選択を透過する設計のため、ページ上の操作を妨げません。
・ツールバーアイコン連動：ブラウザ右上の拡張機能アイコンにも現在の環境バッジ（および一時OFF状態）をリアルタイムに描画します。
・デベロッパーツール（コンソール）連携：ブラウザのコンソールに現在の環境名をカラー出力します。デバッグ作業中も接続先環境をすぐに確認できます。

■ クイック操作ポップアップと一時OFF機能
・ワンクリック環境割り当て：ツールバーのポップアップから、現在開いているサイト（ホスト名またはホスト名＋ポート番号）をその場で各環境へ登録・解除できます。
・一時OFF（ミュート）機能：現在のサイトのみ、または拡張機能全体のバッジ表示を一時停止できます。ページを再読み込みすることなく元の Favicon と画面状態へ即座に復元され、ブラウザ再起動時には自動でONに復帰するため戻し忘れを防ぎます。

■ 自由度の高いカスタマイズ
・デフォルトの3環境（Production / Staging / Development）に加え、QA・UAT・Local などのカスタム環境を制限なく追加できます。
・環境ごとに各インジケーターの個別ON/OFF、バッジのテキスト（最大4文字）、文字色、フチドリ色、ページ内バッジの表示位置（四隅）とフォントサイズを細かく設定できます。

✨ 【 特徴的な機能 】
■ ポート番号・URLパス・正規表現に対応した柔軟なマッチング
・ドメイン単位だけでなく、ポート番号（例：localhost:3000 と localhost:8080 の区別）やサブディレクトリ（例：example.com/stg）を含めたURLパターン指定、および正規表現（Regex）に対応しています。
・複数のルールが同時に一致する場合は、詳細度の高いルール（より深いパス指定 ＞ ポート指定あり ＞ ホスト名のみ、通常パターン ＞ 正規表現）が設定順にかかわらず自動で優先適用されます。

■ SPA（シングルページアプリケーション）の画面内遷移へのリアルタイム追従
・ページ全体の再読み込みを伴わないURLパスの遷移や、サイト側による動的な Favicon 変更を自動検知し、遷移先のURLに応じてバッジの適用や元の状態への復元を即座に反映します。

■ 誤編集を防ぐポップアップ保護ロック
・パス指定ルールや正規表現、親ホスト設定によって一致しているページでは、ポップアップ上での誤操作による共有ルールの上書き・削除を防ぐためロック案内を表示し、オプション画面での安全な編集へ誘導します。

📌 【 使用方法 】
■ ポップアップから素早く登録する場合
1. 識別したいWebページを開き、ブラウザのツールバーにある EnvIcon アイコンをクリックします。
2. 表示された環境リストから割り当てたい環境をクリックすると、即座にバッジが適用されます。

■ オプション画面で詳細に設定する場合
1. ポップアップ右上の歯車アイコン、または拡張機能メニューからオプション画面を開きます。
2. 既存の環境を編集するか、「環境追加」ボタンから新しい環境を作成します。
3. 対象のURLパターン（例：localhost:3000、stg.example.com、example.com/admin など）を入力し、バッジの配色や表示位置を調整します。変更内容は入力検証のうえ自動的に保存され、開いているタブへ即座に反映されます。

⚙️ 【 開発者・上級者向け機能 】
■ リアルタイム URL チェッカー
・オプション画面内で任意のURLを入力してテストでき、優先順位ルールに基づいて実際に適用される環境バッジのプレビューと、一致したパターン行のハイライトをその場で確認できます。

■ 自動保存と入力不備理由の即時確認
・設定変更はリアルタイムにバリデーションと自動保存が行われます。カラーコードやURL構文の不備、環境間でのパターン重複などがある場合は保存を保留し、画面下部のステータス表示にマウスオーバー（またはフォーカス）することで環境ごとの具体的な不備理由を一覧で確認できます。

■ パターン管理とチーム間での設定共有
・登録したURLパターンは削除せずに個別の有効/無効（ON/OFF）を切り替えられるほか、ドラッグ＆ドロップによる優先順の並び替えに対応しています。また、環境設定を JSON 形式でエクスポート・インポートできるため、チームメンバー間での設定共有やバックアップに活用できます。

■ ダークモード・多言語UI・ブラウザ間同期
・ライトモードとダークモードの切り替え、日本語と英語の表示切り替え、初回オンボーディングツアー、および Chrome 同期ストレージによる同一アカウント間での設定自動同期に対応しています。

---

## English

### **Name**
EnvIcon - Environment Identifier & Favicon Badge

### **Short Description**
Visually distinguish Production, Staging, and Development environments with dynamic favicon, in-page, and toolbar badges.

### **Detailed Description**
💡 [ OVERVIEW ]
EnvIcon is a Chrome extension built for developers, QA engineers, and system operators who work across multiple environments (such as Production, Staging, and Development) simultaneously.
Based on your configured URL patterns - including hostnames, port numbers, URL paths, and regular expressions - EnvIcon dynamically applies favicon overlays, floating in-page badges, toolbar icon indicators, and DevTools console logs to help prevent accidental actions in the wrong environment.

🛠️ [ CORE FEATURES ]
* Four Visual Environment Indicators
- Dynamic Favicon Badge: Overlays an environment label (up to 4 characters, such as PROD or STG) onto the page's favicon so you can identify environments at a glance across many open tabs.
- In-Page Floating Badge: Displays a semi-transparent badge fixed to any corner of the viewport. Uses click-through styling so it never blocks page clicks or text selection.
- Dynamic Toolbar Icon: Updates the extension toolbar icon in real time to reflect the matched environment or paused state.
- DevTools Console Output: Prints the active environment name in color within the browser console for quick verification during debugging.

* Quick Action Popup & Temporary Pause
- One-Click Assignment: Assign or remove the current site (hostname or hostname:port) to any environment directly from the toolbar popup without opening the options page.
- Temporary Mute (Per-Site or Global): Pause indicators for the current site or across all sites with a single toggle. The original favicon and page state are restored immediately without reloading, and indicators automatically resume when the browser restarts so you do not forget to turn them back on.

* Flexible Customization
- Includes Production, Staging, and Development presets out of the box, plus support for unlimited custom environments (such as QA, UAT, or Local).
- Configure indicator toggles, badge text (up to 4 characters), fill color, outline color, badge corner position, and font size independently for each environment.

✨ [ DISTINGUISHING FEATURES ]
* Port, URL Path, and Regex Matching with Smart Priority
- Match rules by hostname, port number (e.g., distinguishing localhost:3000 from localhost:8080), URL path prefix on segment boundaries (e.g., example.com/stg), or regular expressions (Regex).
- When multiple rules match the same URL, specificity-based priority automatically selects the most specific rule (deeper URL path > port-specific rule > hostname-only rule; exact pattern > regex) regardless of environment order.

* Real-Time SPA Navigation & Dynamic Favicon Support
- Tracks client-side URL changes in Single Page Applications (pushState / popstate) as well as dynamic favicon updates by the host site, applying or restoring badges immediately without a page reload.

* Accidental Edit Protection in Popup
- When a page matches via a shared URL path rule, regular expression, or parent hostname rule, the popup locks one-click overwriting and guides you to the options page to prevent unintended changes to shared rules.

📌 [ HOW TO USE ]
* Quick Setup from the Toolbar Popup
1. Open the target web page and click the EnvIcon icon in the browser toolbar.
2. Select an environment from the list to apply the badge immediately.

* Detailed Configuration in the Options Page
1. Click the gear icon in the popup (or open Extension Options) to launch the settings page.
2. Edit an existing environment or click "+ Add Environment" to create a custom one.
3. Enter target URL patterns (e.g., localhost:3000, stg.example.com, example.com/admin) and adjust badge colors, text, and position. Valid changes are saved automatically and applied to open tabs in real time.

⚙️ [ DEVELOPER & POWER-USER FEATURES ]
* Built-In URL Checker
- Test any URL directly in the options page to preview the resulting environment badge and highlight the exact winning pattern row based on priority rules.

* Auto-Save with Validation Reason Popover
- All configuration edits are validated and auto-saved. If an invalid format or duplicate pattern is detected across environments, hovering over (or focusing) the footer status indicator displays a grouped list of specific validation reasons.

* Pattern Controls & Team Sharing (JSON Import / Export)
- Toggle individual URL patterns on or off without deleting them, and reorder pattern priority via drag-and-drop. Export and import full environment configurations as JSON files for backups or team sharing.

* Light / Dark Theme, Bilingual UI, and Browser Sync
- Supports Light and Dark themes, instant switching between English and Japanese UI, an interactive onboarding tour, and automatic cross-device synchronization via Chrome Sync storage.
