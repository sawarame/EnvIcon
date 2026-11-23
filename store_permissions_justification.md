# Chrome Web Store Permissions Justification

## Single Purpose Description

### English
EnvIcon visually identifies user-configured web environments (such as Production, Staging, and Development) by dynamically overlaying environment badges onto page favicons, in-page corners, toolbar icons, and DevTools console logs to help prevent accidental actions in the wrong environment.

### 日本語
EnvIcon は、ユーザーが設定した Web 環境（本番・ステージング・開発など）を視覚的に識別するため、ページの Favicon・ページ内バッジ・ツールバーアイコン・DevTools コンソール出力へ環境ラベルを動的に表示し、環境の取り違えによる誤操作を防ぐための拡張機能です。

## Permission Justifications

### `storage`

#### English
Used strictly to store and synchronize user configuration and temporary UI state locally within Chrome without sending any data to external servers:
- chrome.storage.sync: Stores the user's environment definitions (environment names, badge colors/text, indicator toggles, and URL/regex matching patterns) and synchronizes them across the user's Chrome browsers.
- chrome.storage.local: Stores device-specific UI preferences including display language selection, light/dark theme preference, and onboarding tour completion status.
- chrome.storage.session: Stores temporary global pause and per-site pause states (with TRUSTED_AND_UNTRUSTED_CONTEXTS access so the content script can check them) that automatically reset when the browser restarts.
- chrome.storage.onChanged: Propagates configuration and pause-state updates immediately across open tabs, the popup, the options page, and the toolbar icon without requiring page reloads.

#### 日本語
外部サーバーへのデータ送信を行わず、ユーザーの設定や一時的なUI状態を Chrome 内で保存・同期するためのみに使用します。
- chrome.storage.sync: ユーザーの環境設定リスト（環境名、バッジの色・文字、各インジケーターのON/OFF、URL・正規表現パターン）を永続化し、同一 Chrome アカウント間で同期します。
- chrome.storage.local: 表示言語設定、ライト/ダークテーマ設定、オンボーディングツアー完了状態など、端末固有のUI設定を保存します。
- chrome.storage.session: 全体一時OFFおよびサイト単位の一時OFF状態をセッション内のみ保持します（コンテンツスクリプトからも参照できるよう TRUSTED_AND_UNTRUSTED_CONTEXTS を設定し、ブラウザ再起動時に自動クリアされます）。
- chrome.storage.onChanged: 設定変更や一時OFF切替を、ページ再読み込みなしで開いているタブ・ポップアップ・設定画面・ツールバーアイコンへ即座に反映します。

### Host permissions (`<all_urls>`) and Content Scripts (`<all_urls>`)

#### English
Required so EnvIcon can automatically match user-defined URLs and render visual environment indicators on any HTTP/HTTPS site configured by the user:
- Content script injection (<all_urls>): Matches the current page URL (hostname, port, and path) against the user's local rules, overlays the environment badge onto the page's favicon, renders a non-blocking floating badge in the page corner, logs the matched environment name to the DevTools console, tracks client-side SPA URL changes, and restores the original favicon and DOM state immediately when paused or navigating away.
- Cross-origin favicon retrieval in the service worker (FETCH_IMAGE): Fetches the site's original favicon image via the background service worker to avoid page CORS restrictions so the extension can composite the environment badge onto the original favicon on an HTML Canvas locally.
- Tab URL inspection and toolbar icon updates: Reads tab URLs and favicon URLs (via chrome.tabs events/queries and sender.tab) to dynamically draw the matched environment badge or paused state onto the toolbar icon, notify content scripts of SPA URL updates, and allow one-click site assignment in the popup.

Why narrower permissions or activeTab cannot be used:
Every developer and organization uses completely different custom domains, internal hostnames, port numbers (such as localhost:3000), and URL paths, so target hosts cannot be fixed in advance. Furthermore, environment indicators must appear automatically as soon as any matching tab loads or navigates in the background without requiring the user to click the extension icon first, which activeTab does not allow.

Data privacy:
EnvIcon does not collect, track, or transmit browsing history or user data to any external server. All URL matching and badge rendering happen locally in the browser; the only network request initiated by the service worker is fetching the visited site's own favicon image strictly for local badge compositing.

#### 日本語
ユーザーが自由に設定した任意の HTTP/HTTPS サイト上で自動的に URL を照合し、視覚的な環境インジケーターを表示するために必要です。
- コンテンツスクリプトの注入（<all_urls>）: 現在開いているページの URL（ホスト名・ポート番号・パス）をローカル設定と照合し、Favicon へのバッジ重ね合わせ、操作を妨げないページ内フローティングバッジの表示、DevTools コンソールへの環境名出力、SPA 画面内遷移の追跡、および一時OFFや対象外遷移時の元 Favicon・DOM 状態の即時復元を行います。
- Service Worker 経由の元 Favicon 画像取得（FETCH_IMAGE）: クロスオリジン制約（CORS）によりコンテンツスクリプトから直接 Canvas 描画できない元サイトの Favicon 画像をバックグラウンド経由で取得し、ローカルの Canvas 上で環境バッジと合成します。
- タブ URL 参照とツールバーアイコン更新: タブの URL や Favicon URL（chrome.tabs イベント・クエリおよび sender.tab）を参照し、一致した環境バッジや一時OFF状態をツールバーアイコンへリアルタイム描画するほか、SPA の URL 変更通知やポップアップからのワンクリック登録に使用します。

より狭い権限や activeTab で代替できない理由:
開発者やチームごとに使用する本番・ステージング・開発ドメイン、社内ホスト名、ポート番号（localhost:3000 など）、URL パスは完全に異なるため、あらかじめ特定のドメインへ限定できません。また、誤操作防止という目的上、ユーザーが拡張機能アイコンをクリックする前からタブの読み込み時・切り替え時・SPA遷移時に自動でインジケーターを表示し続ける必要があり、クリック時のみ権限が付与される activeTab では実現できません。

データプライバシー:
閲覧履歴やユーザーデータを外部サーバーへ収集・追跡・送信することは一切ありません。URL マッチングおよびバッジ描画はすべてブラウザ内でローカルに完結しており、Service Worker が行う通信はローカル合成のために訪問中サイト自身の Favicon 画像を取得する処理のみです。

## Remote Code Usage

### English
This extension does not use remotely hosted code. All executable code, UI frameworks, and libraries are bundled within the extension package at build time. No external scripts are loaded or evaluated dynamically.

### 日本語
この拡張機能はリモートホストされたコードを使用しません。すべての実行可能コード、UI フレームワーク、およびライブラリはビルド時に拡張機能パッケージ内に同梱されており、外部スクリプトの動的読み込みや実行は一切行いません。
