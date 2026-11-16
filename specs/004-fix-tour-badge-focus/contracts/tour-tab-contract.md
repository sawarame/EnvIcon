# インターフェース契約書 (Contracts): ヘルプツアー・タブ連動契約

**Feature Branch**: `004-fix-tour-badge-focus` | **Date**: 2026-11-16

本変更は Chrome 拡張機能の Options ページ内部のコンポーネント間連携に関するものであるため、内部コンポーネント契約および UI 要素契約を定義する。

## 1. `EnvSection.vue` タブモデル契約

- **Prop / Emit**: `activeTab?: EnvSectionTab` / `(e: 'update:activeTab', value: EnvSectionTab): void`（親からの `v-model:activeTab` と、`computed` による双方向同期）
- **振る舞い保証**:
  1. 親コンポーネント（`App.vue`）が `v-model:activeTab` をバインドした場合、親の `envTabs[env.id]` と双方向同期する。
  2. 親が `activeTab` を渡さない単独利用時でも、デフォルト値 `'urls'` として独立動作する。
  3. 既存の `props.matchedPatternIndex` による自動タブ切替（URLチェッカー一致時に `'urls'` へ切り替える機能）は引き続き `activeTab.value = 'urls'` を通じて動作し、親の `envTabs[env.id]` へも整合的に反映される。
- **UI 要素識別契約**:
  - 「バッジ設定」グループボックス（バッジ文字・文字色・枠線色を含む `.settings-group-box`）は `.badge-settings-box` クラスを保持しなければならない（MUST）。
  - 「URLパターン」タブ内の入力グループは引き続き `.hostname-custom-input-group` クラスを保持しなければならない（MUST）。
  - 本番環境カードルートは引き続き `#env-section-prod` ID を保持しなければならない（MUST）。

## 2. `useTour` 初期化・実行契約 (`src/options/composables/useTour.ts`)

- **シグネチャ**:
  ```ts
  export interface UseTourOptions {
    getEnvTab?: (envId: string) => EnvSectionTab;
    setEnvTab?: (envId: string, tab: EnvSectionTab) => Promise<void> | void;
  }

  export const useTour = (options: UseTourOptions = {}) => { ... }
  ```
- **振る舞い保証**:
  1. `options` が省略された場合でもエラーを投げず安全に動作する（後方互換性）。
  2. `startTour()` 呼び出し時、開始直前に `options.getEnvTab?.('prod')` で本番環境カードの現在のタブを取得し、セッション内ローカル変数に保持する。
  3. `intro.onBeforeChange` は `async (targetElement, currentStep)` として動作し、ステップに応じたタブ切替（`await options.setEnvTab?.('prod', requiredTab)`）およびレイアウト反映待機が完了した後に `return true` する。
  4. `App.vue` 側の `setEnvTab`（または `useTour` 内の切替ラッパー）は、値変更後に `await nextTick()` および描画フレーム確定（`requestAnimationFrame`）を待機する Promise を返す。
  5. `intro.onExit`（および `start()` 失敗時の `finally` フォールバック）において、保持していた初期タブを一度だけ復元し、復元済みフラグ等で二重復元を防止する。

## 3. DOM / スタイル・オーバーレイ整合性契約

- `TabPanel` は `lazy` を使わない既存構成（`v-show` による表示制御）を維持し、`intro.start()` 時点の `document.querySelector` で `#env-section-prod .badge-settings-box` および `#env-section-prod .hostname-custom-input-group` の双方が必ず取得可能であること。
- `App.css` の `body:has(.introjs-overlay)` による固定フッター `z-index` 調整は既存のままとし、タブ切替後もツールチップとハイライト枠がオーバーレイ上で正しく視認できること。
