# インターフェース契約: コンテキスト間メッセージングおよびストレージ連携

**対象機能**: [spec.md](../spec.md) (`001-port-path-matching`)
**作成日**: 2026-11-07

---

## 1. コンテキスト間メッセージング契約 (`chrome.runtime` / `chrome.tabs`)

プロジェクト憲章（原則 I）に従い、すべてのメッセージ型は `src/types.ts` に一元定義する。

### 1.1 Content Script → Service Worker (`chrome.runtime.sendMessage`)

#### (1) `GET_TAB_INFO`（既存維持）
- **Request**: `{ type: "GET_TAB_INFO" }`
- **Response (`TabInfoResponse`)**: `{ favIconUrl?: string; url?: string }`
- **用途**: DOM 内に `<link rel="icon">` が存在しないページでブラウザ検出済みの Favicon URL を補完する。

#### (2) `FETCH_IMAGE`（既存維持）
- **Request**: `{ type: "FETCH_IMAGE", url: string }`
- **Response (`FetchImageResponse`)**: `{ dataUrl?: string; error?: string }`
- **用途**: CORS 制限を回避して元サイトの Favicon 画像を Data URL として取得する。

---

### 1.2 Service Worker → Content Script (`chrome.tabs.sendMessage`) 【新規追加】

#### (1) `URL_CHANGED`
- **発火トリガー**: `src/background.ts` の `chrome.tabs.onUpdated` において `changeInfo.url` が存在する場合（SPA での `history.pushState` / `replaceState` 等による画面内URL遷移時）。
- **Payload (`TabUrlChangedMessage`)**:
  ```ts
  {
    type: "URL_CHANGED";
    url: string;
  }
  ```
- **Response**: 不要（単方向通知。対象タブにコンテンツスクリプトが未注入または破棄済みの場合に生じる送信エラーは `catch` して安全に無視する）。
- **Content Script 側の振る舞い (`src/features/url_observer.ts`)**:
  - メッセージ受信時（および `window` の `popstate` イベント発火時）、現在の `window.location.href` から `hostWithPort + pathname` を算出し、直前に評価したキーと異なる場合のみ再評価コールバックを実行する（クエリ `?` やハッシュ `#` のみの変更では再描画を行わない）。

---

## 2. Chrome Storage 同期・リアクティブ契約

| ストレージ領域 | キー | 書き込み元 | 購読・反応先 |
| :--- | :--- | :--- | :--- |
| `chrome.storage.sync` | `environments` | Options UI（500ms デバウンス自動保存 / インポート）、Popup UI（ワンクリック登録・解除） | Content Script（Favicon・ページバッジ即時更新）、Service Worker（全タブのアクションアイコン再評価）、Options UI / Popup UI（外部変更の画面同期） |
| `chrome.storage.session` | `globalDisabled`, `disabledHostnames` | Popup UI（全体ON/OFF、サイト別一時OFF）、Options UI（全体一時OFF解除ボタン） | Content Script（即時ミュート復元 / 再適用）、Service Worker（全タブのミュートアイコン更新）、Options UI / Popup UI |
| `chrome.storage.local` | `language`, `darkMode`, `tutorialCompleted` | Options UI | Options UI、Popup UI |
