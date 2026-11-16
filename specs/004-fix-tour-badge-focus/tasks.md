---

description: "ヘルプツアーにおける「バッジのカスタマイズ」タブ自動切替とフォーカス復元の実装タスクリスト"
---

# Tasks: ヘルプツアーにおける「バッジのカスタマイズ」タブ自動切替とフォーカス復元

**Input**: Design documents from `/specs/004-fix-tour-badge-focus/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/tour-tab-contract.md, quickstart.md

**Tests**: 本機能は Chrome 拡張機能 Options UI（Intro.js ＋ PrimeVue Tabs 連携）の改修であり、仕様上自動テストスイートの構築は要求されていないため、ビルド検証ゲート（`npm run build`）および Chrome デベロッパーモードでの E2E 検証シナリオ（[quickstart.md](./quickstart.md)）により検証する。

**Organization**: タスクは独立実装・独立検証が可能な単位でユーザーストーリーごとに整理されている。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 異なるファイルへの作業であり未完了タスクへの依存がないため並列実行可能
- **[Story]**: 対応するユーザーストーリー（`[US1]`, `[US2]`, `[US3]`）
- 各タスクには対象ファイルパスを明記する

---

## Phase 1: Setup（共有型の準備）

**Purpose**: コンポーネントおよび Composable 間で共有するタブ識別子の型を定義する

- [X] T001 環境設定カードのタブ識別子型 `EnvSectionTab`（`'urls' | 'appearance'`）および日本語 JSDoc を `src/types.ts` に追加する

---

## Phase 2: Foundational（タブ制御・ツアー連携基盤）

**Purpose**: 各環境カードのタブ状態を親画面から宣言的に読み書きし、レイアウト確定まで待機できる共通基盤を整備する

**⚠️ CRITICAL**: すべてのユーザーストーリー実装は本フェーズ完了後に着手すること

- [X] T002 `src/options/components/EnvSection.vue` で `activeTab` prop と `update:activeTab` emit（算出プロパティによる双方向同期）を導入して既存の `matchedPatternIndex` watch と統合し、バッジ外観設定ボックス（`.settings-group-box` 1つ目）に識別用クラス `.badge-settings-box` を付与する
- [X] T003 `src/options/App.vue` に環境別タブ状態マップ `envTabs`（`Record<string, EnvSectionTab>`）と `getEnvTab` / `setEnvTab`（`nextTick` ＋ `requestAnimationFrame` でレイアウト反映を待機）および日本語 JSDoc を実装し、`EnvSection` の `v-model:activeTab` へバインドする（T001, T002 完了後）
- [X] T004 `src/options/composables/useTour.ts` にタブ連携インターフェース `UseTourOptions`（`getEnvTab`, `setEnvTab`）および日本語 JSDoc を追加し、`src/options/App.vue` の `useTour({ getEnvTab, setEnvTab })` 呼び出しへ接続する（T003 完了後）

**Checkpoint**: 親画面から任意の環境カードのタブ状態を型安全に取得・切替・描画待機できる基盤が完成

---

## Phase 3: User Story 1 - 「バッジのカスタマイズ」ステップでの自動タブ切替と設定項目フォーカス (Priority: P1) 🎯 MVP

**Goal**: ヘルプツアーで「バッジのカスタマイズ」ステップへ進んだ際、自動的に本番環境カードの「デザイン・表示設定」タブへ切り替え、「バッジ設定」エリア（文字・文字色・枠線色）に正確なハイライトと案内ツールチップを表示する

**Independent Test**: 本番環境カードが「URLパターン」タブを開いた初期状態からヘルプツアーを開始し、Step 2（「バッジのカスタマイズ」）へ進んだ際に「デザイン・表示設定」タブへ切り替わり、`.badge-settings-box` がハイライトされて案内吹き出しがその付近に表示されることで独立検証できる

### Implementation for User Story 1

- [X] T005 [US1] `src/options/composables/useTour.ts` の「バッジのカスタマイズ」ステップのターゲットセレクタを `#env-section-prod .smart-settings-container` から `#env-section-prod .badge-settings-box` へ修正する
- [X] T006 [US1] `src/options/composables/useTour.ts` の `intro.onBeforeChange` を `async` コールバック化し、「バッジのカスタマイズ」ステップ遷移時に `await options.setEnvTab?.('prod', 'appearance')` を実行し、環境カードヘッダーとタブ一覧が見切れないスクロール量調整（`scrollEnvStepIntoView`）の後に `scrollToElement: false` でフォーカス表示するよう実装する（T004, T005 完了後）

**Checkpoint**: User Story 1（MVP）が単体で機能し、「バッジのカスタマイズ」ステップで確実にタブ切替と設定項目フォーカスが行われる状態

---

## Phase 4: User Story 2 - ツアー進行方向（進む・戻る）に応じた対象タブの双方向連動 (Priority: P1)

**Goal**: 「バッジのカスタマイズ」⇔「URLパターンの設定」間、および後続ステップからの「戻る」移動を含め、順方向・逆方向のどちらの遷移でも対象ステップが属するタブへ自動的に切り替わりフォーカスが維持されるようにする

**Independent Test**: ヘルプツアーで Step 1〜4 を「次へ」と「戻る」で往復移動し、Step 1（URLパターンの設定）では「URLパターン」タブ、Step 2（バッジのカスタマイズ）では「デザイン・表示設定」タブへ毎回自動で切り替わり、対象要素が正確にハイライトされることで独立検証できる

### Implementation for User Story 2

- [X] T007 [US2] `src/options/composables/useTour.ts` のツアーステップ順序を「URLパターンの設定」（Step 1 → `'urls'`）を先、「バッジのカスタマイズ」（Step 2 → `'appearance'`）を後に変更し、`intro.onBeforeChange` で「次へ」および「戻る」の双方で対象タブへ切り替えてタブ見切れ防止スクロールを適用するよう更新する（T006 完了後）

**Checkpoint**: User Story 1 および User Story 2 の双方が独立して動作し、ツアー内の前後移動でタブ連動とフォーカスが一切崩れない状態

---

## Phase 5: User Story 3 - ツアー完了・中断後の閲覧状態復元と操作復帰 (Priority: P2)

**Goal**: ヘルプツアーを最後まで完了した場合も途中で中断（スキップ・閉じる・`Esc`・アンマウント）した場合も、ツアー開始前にユーザーが開いていたタブ状態へ自動的に復元し、即座に通常操作を再開できるようにする

**Independent Test**: 「URLパターン」タブを開いた状態、および「デザイン・表示設定」タブを開いた状態のそれぞれからツアーを開始し、完了操作と途中終了操作の双方を行った後に開始前のタブへ戻ることで独立検証できる

### Implementation for User Story 3

- [X] T008 [US3] `src/options/composables/useTour.ts` の `startTour()` 開始時に `initialProdTab = options.getEnvTab?.('prod')` を記録し、`intro.onExit`（完了・中断の双方で発火）および `try ... finally` 起動失敗ガードにて重複実行を防ぎつつ元のタブ状態へ復元する処理を実装する（T004 完了後）

**Checkpoint**: すべてのユーザーストーリー（US1, US2, US3）が独立かつ統合的に機能する状態

---

## Phase 6: Polish & Cross-Cutting Concerns（ドキュメント同期とビルド・検証ゲート）

**Purpose**: 設計ドキュメント同期・TypeScript/Webpack ビルド検証・Chrome 拡張機能実機確認を完了する

- [X] T009 [P] `DESIGN.md` の「3.4 オンボーディングツアー (`intro.js`)」セクションに、環境カードタブとの双方向自動連動およびツアー終了時の元タブ復元仕様を追記する
- [X] T010 プロジェクトルートで `npm run build` を実行し、TypeScript `strict: true` 型チェック・Webpack 本番バンドル・`package.zip` 生成がエラーなく完了することを検証する（T001〜T009 完了後）
- [ ] T011 `specs/004-fix-tour-badge-focus/quickstart.md` の検証シナリオ A〜D（初期状態からの完走、戻る往復移動、デザイン・表示設定タブ開始＋途中中断復元、日英言語・ライト/ダーク両テーマ・狭画面幅）を Chrome 拡張機能デベロッパーモードで検証する（T010 完了後）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即時開始可能（`T001`）
- **Foundational (Phase 2)**: Phase 1 完了後に開始（`T002` → `T003` → `T004`）。Phase 2 完了が全ユーザーストーリーの前提条件
- **User Story 1 (Phase 3 - P1)**: Phase 2 完了後に開始可能（`T005` → `T006`）
- **User Story 2 (Phase 4 - P1)**: `T006`（`onBeforeChange` の非同期化）完了後に拡張（`T007`）
- **User Story 3 (Phase 5 - P2)**: Phase 2（`T004`）完了後に独立して実装可能（`T008`）
- **Polish (Phase 6)**: `T009` は他のコード実装と並列実施可能。`T010`（ビルド検証）と `T011`（実機検証）は全実装完了後に実施

### Parallel Opportunities

- `T001`（`src/types.ts`）の完了後、基盤フェーズの `T002`（`EnvSection.vue`）を進めつつ、ドキュメント更新 `T009`（`DESIGN.md`）を並列実行可能
- `T004` 完了後、`T005`/`T006`/`T007`（ステップ遷移時のタブ切替）と `T008`（開始前タブ保存・終了時復元）は論理的に独立しているため同一ファイル内でも整理して連続/並列設計が可能

---

## Parallel Example: Foundational & Documentation

```bash
# Phase 1 完了後に並列で進められる作業例:
Task: "T002 src/options/components/EnvSection.vue の defineModel 化と .badge-settings-box 付与"
Task: "T009 [P] DESIGN.md 3.4節のオンボーディングツアー仕様更新"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1（`T001`）＋ Phase 2（`T002`〜`T004`）を完了する
2. Phase 3（`T005`〜`T006`: US1）を実装し、「バッジのカスタマイズ」ステップで「デザイン・表示設定」タブへ切り替わりハイライトされる MVP を検証する
3. 続けて Phase 4（`T007`: US2）で「URLパターンの設定」への前進・後退時のタブ切替を補完し、Phase 5（`T008`: US3）で終了時復元を仕上げる
4. Phase 6（`T009`〜`T011`）で `DESIGN.md` 同期・`npm run build`・Chrome 実機 E2E 検証を完了する
