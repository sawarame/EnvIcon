# 技術調査書 (Research): ヘルプツアーにおける「バッジのカスタマイズ」タブ自動切替とフォーカス復元

**Feature Branch**: `004-fix-tour-badge-focus` | **Date**: 2026-11-16

## 調査項目と技術的決定

### 1. Intro.js v8.3.2 のステップ要素解決と `onBeforeChange` 非同期ライフサイクル

- **調査結果**:
  - `node_modules/intro.js/intro.module.js` および `node_modules/intro.js/src/packages/tour/callback.d.ts` を検証した結果、Intro.js v8.3.2 の `start()` 時にステップ配列が初期化され、各ステップの `element` 文字列（CSSセレクタ）は `document.querySelector` により DOM 要素へ解決される。要素が見つからない場合のみ中央配置のフローティング要素（`introjsFloatingElement`）にフォールバックする。
  - `nextStep()` および `previousStep()` は内部で `await callbacks.beforeChange.call(tour, step.element, currentStep, direction)` を待機した**後**に、`showElement`（ハイライト付与・ツールチップ位置計算・スクロール実行）を行う。`callback.d.ts` 上も `Promise<boolean> | boolean` が公式にサポートされている。
  - `exitIntro`（完了時・スキップ時・`exit()` 強制終了時）は必ず `callbacks.exit`（`onExit`）を発火する。
- **Decision**:
  - ツアー開始時・移動時のタブ切り替え制御は `intro.onBeforeChange` の非同期コールバック（`async`）として実装し、対象タブへ切り替えて DOM 再描画・レイアウト反映を待機してから `return true` を返す。
  - ツアー終了時の元タブ復元は `onExit` コールバック（および万一の `start()` 例外に備えた `try ... finally` ガード）で実行する。
- **Rationale**:
  - `intro.js` の公式ライフサイクルに沿って `showElement` の実行前に確実に対象タブを可視化でき、ハイライト枠の座標ずれやスクロール位置の誤判定を根本から防止できるため。
- **Alternatives considered**:
  - `onChange` / `onAfterChange` 内でタブを切り替えて `tour.refresh()` を呼ぶ案：要素が非表示（`display: none`）の状態で一度 `showElement` とスクロールが走ってから再描画されるため、画面のちらつきやスクロール位置の不整合が起きやすく却下。

### 2. PrimeVue v4 `Tabs` / `TabPanel` の DOM 保持とレイアウト確定タイミング

- **調査結果**:
  - `node_modules/primevue/tabpanel/TabPanel.vue` の実装を確認した結果、`Tabs` に `lazy` プロパティを指定しないデフォルト構成（現在の `src/options/components/EnvSection.vue`）では、非選択の `TabPanel` も `v-show="active"` により DOM ツリー上に常時存在している（`display: none` 状態）。
  - したがって、`intro.start()` 時点の `document.querySelector` でも別タブ内の要素参照自体は取得できているが、表示が `display: none` のままだと `getBoundingClientRect()` がすべて `0` となり「どこにもフォーカスされない（あるいは画面左上に崩れる）」現象を引き起こす（加えて、現在は旧セレクタ `.smart-settings-container` 自体が削除されていた）。
  - タブ切替のリアクティブ値（`activeTab`）を変更した後、Vue の DOM 更新（`await nextTick()`）を経て `v-show` の `display: none` が解除され、さらにブラウザのスタイル・レイアウト計算（`requestAnimationFrame` 1フレーム待機）を通すことで、直後の座標取得・スクロールが確実に最新レイアウトを参照できる。
- **Decision**:
  - `EnvSection.vue` の `Tabs` は既存の非遅延（`lazy` 無効）構成を維持し、タブ切替後は `await nextTick()` ＋ `requestAnimationFrame` 待機を行ってから Intro.js へ処理を戻す。
- **Rationale**:
  - DOM 要素の生成・破棄を伴わずに `display` 属性のみで瞬時に切り替わるため、`start()` 時のステップ要素事前解決と完璧に噛み合い、かつ切替の遅延も1フレーム（約16ms以下）に抑えられるため。
- **Alternatives considered**:
  - `setTimeout` で固定時間（例: 100ms）待機する案：環境依存の体感遅延や不要な待ち時間が生じるため、`nextTick` ＋ `requestAnimationFrame` のフレーム同期方式を採用。

### 3. ツアー対象セレクタの特定（古い `.smart-settings-container` の廃止と再特定）

- **調査結果**:
  - `src/options/composables/useTour.ts` では「バッジのカスタマイズ」ステップが `#env-section-prod .smart-settings-container` を指していたが、`003-options-ui-redesign` によるタブ化に伴い当該クラスが消滅していた。
  - 現在の `src/options/components/EnvSection.vue` の「デザイン・表示設定（`appearance`）」タブ内には2つの `.settings-group-box` が並んでおり、1つ目が「バッジ設定（バッジ文字・文字色・枠線色）」、2つ目が「機能トグル群（Favicon・ページ内バッジ・コンソールログ）」である。
  - 案内文言（`tourBadgeMsg`：「バッジの文字（4文字以内）や色は自由に変えられます...」）と一致するのは1つ目の「バッジ設定」ボックスである。
- **Decision**:
  - `EnvSection.vue` の「バッジ設定」の `.settings-group-box` に明確な識別用クラス `.badge-settings-box`（または同等の専用セレクタ）を付与し、ツアーステップは `#env-section-prod .badge-settings-box` をターゲットとする。
  - 「URLパターンの設定」ステップは引き続き `#env-section-prod .hostname-custom-input-group`（`urls` タブ内）をターゲットとする。
- **Rationale**:
  - `:first-child` 等の構造依存セレクタを避け、レイアウト変更に強い明示的なターゲット指定を行うため。
- **Alternatives considered**:
  - `.appearance-grid` 全体を対象にする案：機能トグル群まで含まれてしまい、「バッジの文字や色」という説明に対してフォーカス範囲が広すぎるため不採用。

### 4. `useTour` と `EnvSection` / `App.vue` 間のタブ制御アーキテクチャ

- **調査結果**:
  - 現在 `EnvSection.vue` は `const activeTab = ref<string>('urls')` をローカル状態としてのみ保持しており、外部からタブを切り替えたり現在タブを参照したりする手段がない。
  - `useTour.ts` 側から DOM のタブボタンを `.click()` で擬似操作する方法も考えられるが、PrimeVue の内部構造（`.p-tab` 属性やクリック伝播）への脆い依存を生み、Constitution 原則 I・IV の型安全性・モジュール分離に反する。
- **Decision**:
  - `src/types.ts` にタブ種別型 `export type EnvSectionTab = 'urls' | 'appearance';` を定義する。
  - `EnvSection.vue` で `activeTab` オプショナル prop と `update:activeTab` emit（`computed` の get/set による双方向同期、単独利用時はローカル ref フォールバック）を採用し、親コンポーネント（`App.vue`）からもタブ状態を読み書きできるようにする（既存の `matchedPatternIndex` watch による `'urls'` 自動切替もそのまま機能する。なお、`vue-loader` + `ts-loader` 環境との整合性を考慮し `defineModel` マクロではなく明示的な `defineProps` / `defineEmits` を採用する）。
  - `App.vue` は各環境のタブ状態を `envTabs = ref<Record<string, EnvSectionTab>>({})` で管理し、`useTour({ getEnvTab, setEnvTab })` として型安全なコールバックを注入する。
- **Rationale**:
  - `useTour.ts` が Vue コンポーネントや DOM のタブボタン実装に依存せず、純粋にツアー進行とタブ要求を宣言的に扱える。また、`App.vue` からも将来の機能（例：一括タブ操作など）へ自然に拡張可能となる。
- **Alternatives considered**:
  - `EnvSection.vue` に `defineExpose` で `setActiveTab` を生やし、`App.vue` で `v-for` のテンプレート参照マップを管理する案：`v-for` での ref コールバック管理が冗長になるため、`defineModel` ＋ `Record<string, EnvSectionTab>` の方が宣言的でシンプル。
