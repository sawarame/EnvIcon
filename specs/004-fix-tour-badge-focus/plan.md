# 実装計画書 (Implementation Plan): ヘルプツアーにおける「バッジのカスタマイズ」タブ自動切替とフォーカス復元

**Branch**: `004-fix-tour-badge-focus` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-fix-tour-badge-focus/spec.md`

## Summary

オプション設定画面の環境カードがタブ化（`urls` タブと `appearance` タブ）されたことに伴い、ヘルプツアー（Intro.js）の「バッジのカスタマイズ」ステップが消滅済みセレクタ（`.smart-settings-container`）を参照し、かつ非表示タブ内の要素へ遷移するため、どこにもフォーカスされない不具合を解消する。

技術的には、`EnvSection.vue` のタブ選択状態を `activeTab` プロパティと `update:activeTab` イベント（算出プロパティによる双方向バインディング）として親画面（`App.vue`）と連携し、`useTour.ts` へタブ参照・切替コールバック（`getEnvTab` / `setEnvTab`）を注入する。Intro.js v8 の `onBeforeChange` が非同期 `Promise<boolean>` を待機する仕様を活用し、ステップ遷移（「次へ」・戻るの双方）の描画前に該当タブへ切り替えて `nextTick` ＋ `requestAnimationFrame` でレイアウトを確定させ、ツアー終了・中断時には `onExit` で開始前のタブ状態を復元する。

## Technical Context

**Language/Version**: TypeScript 5.9 (`target: ES2020`, `moduleResolution: "bundler"`, `strict: true`)

**Primary Dependencies**: Vue 3.5 (`<script setup lang="ts">`), PrimeVue 4.5 (`Tabs` / `TabPanel`), Intro.js 8.3.2, Webpack 5.105

**Storage**: Chrome Storage API（永続化データ構造の変更なし。既存の `chrome.storage.local` の `tutorialCompleted` のみ参照・更新）

**Testing**: `npm run build` による TypeScript 厳格型検査・Webpack 本番バンドル検証、および Chrome デベロッパーモードでの E2E 手動検証シナリオ（[quickstart.md](./quickstart.md)）

**Target Platform**: Google Chrome（Manifest V3 拡張機能 — Options UI）

**Project Type**: Browser Extension（Vue 3 Extension Options Page）

**Performance Goals**: タブ切替を伴うステップ遷移において1フレーム＋`nextTick`（体感遅延なく1秒未満）で対象タブ表示とハイライト配置を完了する（`SC-003`）

**Constraints**: 新規外部ライブラリの追加禁止、`strict: true` 準拠（`any` 禁止）、ライト/ダーク両テーマおよび日英両言語の視認性維持、既存URLチェッカーのタブ自動切替機能（`matchedPatternIndex` watch）との非干渉

**Scale/Scope**: Options UI コンテキストの局所改修（`src/types.ts`, `src/options/composables/useTour.ts`, `src/options/components/EnvSection.vue`, `src/options/App.vue`, および設計書 `DESIGN.md` の同期更新）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 事前ゲート検証（Pre-Phase 0）および設計後再検証（Post-Phase 1）

| 憲章原則 | 検証ステータス | 適合内容の確認 |
| :--- | :---: | :--- |
| **I. コンテキスト分離と機能モジュール化** | **PASS** | 変更は Options UI コンテキスト内に閉じており、`useTour.ts` はタブ制御コールバックの注入によりコンポーネント内部実装や DOM クリックに依存しない疎結合設計とする。共有型 `EnvSectionTab` は `src/types.ts` に一元定義する。 |
| **II. 3層ストレージ管理とリアルタイム同期** | **PASS** | `chrome.storage.sync` / `session` には一切触れず、`chrome.storage.local` の `tutorialCompleted` の既存扱いも変更しない。タブ状態はメモリ上のリアクティブ状態として扱う。 |
| **III. 非破壊的なページ介入と復元保証** | **PASS** | Web ページへ注入する Content Script には変更を加えない。また、ツアー完了・中断時に開始前のタブ状態へ確実に復元する。 |
| **IV. 厳格な型安全性と Vue 3 モダン規約** | **PASS** | TypeScript `strict: true`（`any` 禁止）、`<script setup lang="ts">` + `defineProps`/`defineEmits` による型安全な双方向バインディング、非同期処理の `async/await` と `void` 明示を遵守する。新規テキスト追加はなく既存 `i18n.ts` 文言をそのまま活用する。 |
| **V. 日本語ドキュメンテーションと仕様同期** | **PASS** | 新規・更新する型・関数・コールバック・インラインコメントをすべて日本語 JSDoc / 日本語コメントで記述し、`DESIGN.md`（3.4節 オンボーディングツアー）へタブ連動仕様を同期反映する。 |
| **必須ビルド検証ゲート** | **PASS** | 実装完了時に `npm run build` を実行し、型チェック・Webpack バンドル・`package.zip` 生成がエラーなく完了することを検証する。 |

> **判定結果**: 事前検証・Phase 1 設計後再検証ともに全ゲート **PASS**（憲章違反なし）。

## Project Structure

### Documentation (this feature)

```text
specs/004-fix-tour-badge-focus/
├── spec.md                              # 機能仕様書 (/speckit-specify 出力)
├── checklists/
│   └── requirements.md                  # 仕様品質検証チェックリスト
├── plan.md                              # 本実装計画書 (/speckit-plan 出力)
├── research.md                          # Phase 0 調査・技術選定ドキュメント
├── data-model.md                        # Phase 1 データモデル・状態遷移設計
├── quickstart.md                        # Phase 1 E2E検証ガイド
├── contracts/
│   └── tour-tab-contract.md             # Phase 1 コンポーネント・ツアー間契約
└── tasks.md                             # Phase 2 タスク分解 (/speckit-tasks で生成予定)
```

### Source Code (repository root)

```text
src/
├── types.ts                             # 共有型 EnvSectionTab の追加
└── options/
    ├── App.vue                          # 環境別タブ状態管理 (envTabs) と useTour へのコールバック注入
    ├── components/
    │   └── EnvSection.vue               # activeTab prop / update:activeTab 双方向同期と .badge-settings-box 付与
    └── composables/
        └── useTour.ts                   # セレクタ修正、onBeforeChange での双方向タブ切替＆描画待機、onExit 復元

DESIGN.md                                # 3.4節 オンボーディングツアー仕様へのタブ連動記述の同期更新
```

**Structure Decision**: 既存の `src/options/` ディレクトリ構造をそのまま維持し、新規ファイルの追加は行わず既存4ファイル（`src/types.ts`, `EnvSection.vue`, `App.vue`, `useTour.ts`）と `DESIGN.md` のみを更新する最小構成とする。

## Complexity Tracking

憲章違反および特別な複雑性の導入は存在しないため、該当項目なし。
