---

description: "保存エラー表示時のマウスオーバーによる不備理由表示機能の実装タスクリスト"
---

# Tasks: 保存エラー表示時のマウスオーバーによる不備理由表示

**Input**: Design documents from `/specs/002-save-error-hover-reasons/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: 本機能の仕様書では新規テストフレームワークの導入は要求されておらず、プロジェクト憲章に従い TypeScript 厳格型検査・本番バンドル検証（`npm run build`）および [quickstart.md](./quickstart.md) の実機検証シナリオによって品質を担保する。

**Organization**: 各ユーザーストーリーを独立して実装・動作検証できるよう、ストーリー単位（US1〜US3）でフェーズを分割している。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（編集対象ファイルが異なり、同一フェーズ内の未完了タスクに依存しない）
- **[Story]**: 対応するユーザーストーリー識別子（`[US1]`, `[US2]`, `[US3]`）
- すべてのタスクに正確なプロジェクト相対ファイルパスを含める

## Path Conventions

- **実装ディレクトリ**: `src/`（`src/types.ts`, `src/options/`, `src/options/components/`）
- **配布パッケージ定義**: `package/`（※`package/js/` および `package.zip` はビルド生成物のため直接編集禁止）
- **設計・仕様ドキュメント**: `DESIGN.md`, `specs/002-save-error-hover-reasons/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 多言語メッセージ補間基盤および不備理由表示用の日英辞書キーの準備

- [X] T001 `src/options/i18n.ts` の翻訳取得関数を `t(key: TranslationKey, params?: Record<string, string | number>): string` に拡張して `{key}` トークンの安全なリテラル置換（ユーザー入力内の `$` 記号等に影響されない置換）を実装するとともに、不備理由表示用の10翻訳キー（`saveErrorDetailsTitle`, `unnamedEnvironment`, `validationEmptyName`, `validationInvalidBadgeColor`, `validationInvalidBadgeOutlineColor`, `validationInvalidFontSize`, `validationInvalidUrlPattern`, `validationInvalidRegexPattern`, `validationDuplicateSameEnv`, `validationDuplicateOtherEnv`）を英語（`en`）・日本語（`ja`）の双方で定義する

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのユーザーストーリーが共通依存する検証データモデル型とローカライズ変換ヘルパーの構築

**⚠️ CRITICAL**: このフェーズが完了するまで、以降のユーザーストーリー実装を開始してはならない

- [X] T002 `src/types.ts` にランタイム検証モデルとして `ValidationErrorKind`（`'empty_name' | 'invalid_badge_color' | 'invalid_badge_outline_color' | 'invalid_font_size' | 'invalid_url_pattern' | 'invalid_regex_pattern' | 'duplicate_pattern'`）、`ValidationErrorItem`（必須: `envId: string`, `envCustomName: string`, `kind: ValidationErrorKind`、任意: `patternValue?: string`, `patternRowIndex?: number`, `isSameEnvDuplicate?: boolean`, `duplicateOfEnvId?: string`, `duplicateOfCustomName?: string`）、`EnvironmentsValidationResult`（`isValid: boolean`, `hasDuplicate: boolean`, `normalizedEnvironments: EnvironmentConfig[]`, `fieldErrorsByEnv: Record<string, EnvValidationErrorState>`, `errorItems: ValidationErrorItem[]`）、および UI 描画用グループ型 `LocalizedValidationErrorGroup`（`envId: string`, `envDisplayName: string`, `reasons: string[]`）を日本語 JSDoc 付きで定義する
- [X] T003 `src/options/utils.ts` に環境IDとカスタム環境名から現在言語の表示名を解決するヘルパー（`"prod"` / `"stg"` / `"dev"` は各翻訳名、カスタム環境で `envCustomName === ""` の場合は `t('unnamedEnvironment')` を返す）および `ValidationErrorItem[]` を画面上の環境順・項目順を保ったまま `LocalizedValidationErrorGroup[]` へ変換するローカライズ整形関数（`patternValue` が `80` 文字を超える場合は先頭 `80` 文字＋`...` に切り詰めて `t()` へ渡す）を日本語 JSDoc 付きで実装する

**Checkpoint**: 共有型・多言語補間・エラー表示文言の変換基盤が完成し、各ユーザーストーリーの実装に着手可能な状態

---

## Phase 3: User Story 1 - 保存エラー表示へのマウスオーバーによる不備箇所と理由の即時確認 (Priority: P1) 🎯 MVP

**Goal**: オプション設定画面で「入力内容に不備があるため保存されていません」が表示されているとき、保存エラー表示へのマウスオーバーによって画面下部で見切れることなく対象環境名と不備理由の吹き出しを表示し、吹き出し上へのカーソル移動時は表示を維持、双方からカーソルが離れた時および正常状態（保存完了・保存中）では非表示にする。

**Independent Test**: オプション設定画面でいずれかの環境に不正なURLパターン（例: `http://example.com:99999`）や空欄の環境名を入力して保存エラー表示を発生させ、フッターの保存エラー表示へのマウスオーバー表示・吹き出し上への移動維持・離脱時の非表示、および正常状態での非表示を単独検証できる。

### Implementation for User Story 1

- [X] T004 [P] [US1] `src/options/utils.ts` に環境配列を先頭から走査して `EnvironmentsValidationResult` を返す純粋関数 `validateEnvironments(environments: EnvironmentConfig[])` の基本検証処理を実装する（データモデル制約: 1. `env.name.trim() === ""` で `'empty_name'` / `invalidName = true`、2. 空でなく `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/` 不一致の `badgeColor` で `'invalid_badge_color'` / `invalidBadgeColor = true`、3. 同不一致の `badgeOutlineColor` で `'invalid_badge_outline_color'` / `invalidBadgeOutlineColor = true`、4. `env.pageBadgeEnabled !== false` かつ数値でないまたは `< 1` もしくは `> 500` の `pageBadgeFontSize` で `'invalid_font_size'` / `invalidPageBadgeFontSize = true`、5. `hostnames` の非空行に対し `isRegex === false` で `normalizeUrlPattern` が `null` なら `'invalid_url_pattern'`、`isRegex === true` で `new RegExp(rawValue)` が構文エラーなら `'invalid_regex_pattern'` を記録し当該行インデックスを `invalidPatternIndices` に追加）
- [X] T005 [P] [US1] `src/options/components/SaveStatusIndicator.vue` を Vue 3 `<script setup lang="ts">` で新規作成し、オンボーディングツアー互換の `id="save-status"` を持つ保存ステータスピル（`'saving'` / `'error'` / `'saved'` の3状態表示）と、`saveStatus === 'error'` かつ `errorItems.length > 0` のときのみアンカー要素（`position: relative`）の直上（`position: absolute; bottom: calc(100% + 10px); right: 0;`、幅 `min(440px, calc(100vw - 3rem))`・最小幅 `280px`）に環境別グループ（`LocalizedValidationErrorGroup[]`）を描画する吹き出し、および `10px` の隙間を繋ぐ透明ホバーブリッジ疑似要素＋`120ms` クローズ猶予タイマーによるホバー維持・双方離脱クローズ制御を実装する
- [X] T006 [US1] `src/options/App.vue` を更新し、`executeSave` 内のインライン検証ロジックを `src/options/utils.ts` の `validateEnvironments` 呼び出しへ置き換えて `validationErrors` と `validationErrorItems`（`ref<ValidationErrorItem[]>([])`）を更新するとともに、フッターの `#save-status` 部分を `SaveStatusIndicator` コンポーネントに差し替える（あわせて `src/options/App.css` の保存ステータス関連スタイルを必要に応じて整理する）

**Checkpoint**: User Story 1（MVP）が単独で動作し、保存エラー表示へのマウスオーバーで対象環境と不備理由がフッター上方に表示され、正常時は表示されないことを確認できる状態

---

## Phase 4: User Story 2 - 複数不備の一覧把握と修正・取り消し操作へのリアルタイム追従 (Priority: P2)

**Goal**: 全7種の不備（同一環境内および異環境間のパターン重複と重複元環境名の明示、未入力環境名の一貫した代替ラベル表示を含む）を環境順・項目順に漏れなく一覧表示し、10件以上の多数エラー時の吹き出し内縦スクロール、長文パターンの折り返し、ならびに修正・行削除・環境削除・「編集内容を取り消す」操作（直前保存済み状態への一致復帰を含む）での即時更新・エラー完全解除を実現する。

**Independent Test**: 複数環境に10件以上の複合エラー（空欄環境名、不正カラー、不正正規表現、同一環境内および異環境間重複）を発生させて吹き出し内スクロールと重複元環境表示・赤枠強調との完全一致を確認し、個別修正および Undo・削除でエラー残留 0件となることを単独検証できる。

### Implementation for User Story 2

- [X] T007 [P] [US2] `src/options/utils.ts` の `validateEnvironments` に重複追跡マップ `Map<string, { envId: string; envCustomName: string }>` によるパターン一意性検証を追加し、初出の有効キー（`pattern:${normalized}` または `regex:${rawValue}`）を登録し、2回目以降に出現した後発重複行のみを `invalidPatternIndices` および `kind: 'duplicate_pattern'`（`origin.envId === env.id` なら `isSameEnvDuplicate: true`、異なれば `duplicateOfEnvId: origin.envId` と `duplicateOfCustomName: origin.envCustomName` を設定）として記録し、`fieldErrorsByEnv` と `errorItems` の 100% 一致を保証する
- [X] T008 [P] [US2] `src/options/components/SaveStatusIndicator.vue` の吹き出し内部リスト領域を更新し、最大高さ `min(300px, calc(100vh - 140px))` および `overflow-y: auto` による10件以上の多数エラー時の内部縦スクロール、長文パターン文字列に対する `overflow-wrap: anywhere` 折り返し、ならびに `saveStatus` が `'error'` 以外（`'saving'` / `'saved'`）へ変化した際の即時クローズ（待機中タイマーのクリアを含む）を実装する
- [X] T009 [US2] `src/options/App.vue` の `onSettingsChange` および編集取り消し・削除時の状態同期を更新し、入力修正・行削除・環境削除・`undoChanges` によって `currentUIState === initialSettingsStr`（直前の保存済み状態と同一）に戻った場合にも、進行中の `autoSaveTimer` を確実にクリアした上で `validateEnvironments` を即時実行し、不備 0件時に `validationErrors` と `validationErrorItems` をクリアして `saveStatus = 'saved'` へ即座に復帰させるよう実装する

**Checkpoint**: User Story 1 と User Story 2 が統合動作し、重複元環境の明示・多数エラー時の内部スクロール・あらゆる修正や取り消し操作に対するリアルタイム追従とエラー解除が機能する状態

---

## Phase 5: User Story 3 - 表示言語およびライト・ダークテーマに応じた視認性の確保 (Priority: P3)

**Goal**: 日英表示言語のリアルタイム切り替え連動、ライトモード・ダークモード（`.my-app-dark`）双方での十分なコントラスト確保、マウスオーバー可能であることを示す視覚的な手がかり、およびキーボードフォーカス・`Escape` キー操作への対応を完成させる。

**Independent Test**: 保存エラー発生中に言語（日本語 ⇄ English）およびテーマ（ライト ⇄ ダーク）を切り替えてマウスオーバーした際の表示連動と視認性を確認し、さらに `Tab` キーでのフォーカス表示と `Escape` キーでの非表示を単独検証できる。

### Implementation for User Story 3

- [X] T010 [US3] `src/options/components/SaveStatusIndicator.vue` に視覚的アフォーダンスおよびキーボード操作対応を実装する（`saveStatus === 'error'` 時のみピル要素に `cursor: help`・アンバー強調スタイル・右端の補助情報アイコン `pi pi-info-circle`・`tabindex="0"`・`aria-expanded`・`aria-controls` を付与し、`focusin` での吹き出し表示、コンポーネント領域外への `focusout` および `Escape` キー押下でのクローズを実装する）
- [X] T011 [US3] `src/options/components/SaveStatusIndicator.vue`（および必要に応じ `src/options/App.css`）のテーマ連動スタイルを仕上げ、`var(--card-bg)`・`var(--item-bg)`・`var(--border-color)`・`var(--text-primary)`・`var(--text-secondary)` を用いたライトモード／ダークモード（`.my-app-dark`）両対応のコントラストとドロップシャドウ調整、ならびに `currentLanguage` 変更時の吹き出し内テキスト（デフォルト環境名・代替環境名・重複元環境名・理由文）の即時リアクティブ再描画を確認・調整する

**Checkpoint**: 全ユーザーストーリー（US1〜US3）が独立かつ統合された状態で機能し、多言語・両テーマ・キーボード操作に完全対応した完成状態

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: デザイン仕様ドキュメントの同期更新、コーディング規約点検、および最終ビルド検証ゲートの通過

- [X] T012 [P] `DESIGN.md` の「3.3 自動保存ステータスとバリデーション表現」セクションを更新し、保存エラー時の不備理由ホバーポップオーバー仕様（アンカー上方配置・幅と最大高さ制約・内部縦スクロール・視覚的アフォーダンス・キーボードフォーカス対応・テーマ連動）を記載する
- [X] T013 [P] 変更・追加したすべてのソースファイル（`src/types.ts`, `src/options/i18n.ts`, `src/options/utils.ts`, `src/options/components/SaveStatusIndicator.vue`, `src/options/App.vue`, `src/options/App.css`）を点検し、`any` 型不使用・未使用コードの排除・すべての関数およびアロー関数への日本語 JSDoc（概要・`@param`・`@returns`）と日本語インラインコメントの記述がプロジェクト憲章に完全準拠していることを確認する
- [X] T014 リポジトリルートで `npm run build` を実行して TypeScript 厳格型チェック・Webpack 本番バンドル（`package/js/options.js` 等）・`package.zip` 生成がエラーなく正常終了することを確認し、`specs/002-save-error-hover-reasons/quickstart.md` の全検証シナリオ（シナリオ 1〜4 および `intro.js` ツアーの `#save-status` ステップ表示）に沿って動作整合性を確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即時開始可能
- **Foundational (Phase 2)**: Phase 1（`T001`）完了に依存 — すべてのユーザーストーリーのブロッキング前提条件（`T002` → `T003` の順に実行）
- **User Story 1 (Phase 3 - P1 🎯 MVP)**: Phase 2（`T002`, `T003`）完了後に開始可能
- **User Story 2 (Phase 4 - P2)**: User Story 1（Phase 3）で構築した `validateEnvironments`・`SaveStatusIndicator.vue`・`App.vue` 連携を拡張するため Phase 3 完了後に実行推奨
- **User Story 3 (Phase 5 - P3)**: `SaveStatusIndicator.vue` のアフォーダンス・アクセシビリティ・テーマ表現を仕上げるため Phase 4 完了後に実行推奨
- **Polish (Phase 6)**: 全ユーザーストーリー（Phase 3〜5）完了後に実行（`T012`, `T013` 完了後に最終ゲート `T014` を実行）

### User Story Dependencies

- **User Story 1 (P1)**: Foundational（Phase 2）完了後、他ストーリーへの依存なく単独で実装・MVP検証が可能
- **User Story 2 (P2)**: US1 の検証関数と吹き出しコンポーネントを土台として、重複元環境特定・多数エラースクロール・Undo/復元時のエラー残留防止を追加し、単独で検証可能
- **User Story 3 (P3)**: US1/US2 の吹き出しコンポーネントに対して視覚的アフォーダンス・キーボード操作・ライト/ダーク配色調整を統合し、単独で検証可能

### Parallel Opportunities

- **User Story 1 内**: `T004`（`src/options/utils.ts` の基本検証関数実装）と `T005`（`src/options/components/SaveStatusIndicator.vue` の新規作成）は編集対象ファイルが異なるため並列実行可能
- **User Story 2 内**: `T007`（`src/options/utils.ts` の重複元環境追跡拡張）と `T008`（`src/options/components/SaveStatusIndicator.vue` のスクロール・折り返し強化）は編集対象ファイルが異なるため並列実行可能
- **Polish 内**: `T012`（`DESIGN.md` ドキュメント更新）と `T013`（`src/` 配下の JSDoc・型安全性コード点検）は並列実行可能

---

## Parallel Example: User Story 1 & User Story 2

```bash
# User Story 1 における並列実行例（Phase 2 完了後）:
Task T004: "src/options/utils.ts に純粋検証関数 validateEnvironments の基本検証処理を実装"
Task T005: "src/options/components/SaveStatusIndicator.vue に保存ステータスピルと上方向ホバー吹き出しを新規作成"

# User Story 2 における並列実行例（Phase 3 完了後）:
Task T007: "src/options/utils.ts の validateEnvironments に重複元環境の追跡ロジックを追加"
Task T008: "src/options/components/SaveStatusIndicator.vue に内部縦スクロールと長文折り返し制御を追加"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1（Setup: `T001`）を完了する
2. Phase 2（Foundational: `T002` → `T003`）を完了する
3. Phase 3（User Story 1: `T004` & `T005` → `T006`）を完了する
4. **STOP and VALIDATE**: 単一不備発生時のマウスオーバー表示・吹き出し上でのホバー維持・正常時の非表示を確認する（MVP 達成）

### Incremental Delivery

1. Setup + Foundational → 検証データ構造と多言語変換基盤が完成
2. Add User Story 1 → マウスオーバーによる不備理由の吹き出し表示が動作（MVP）
3. Add User Story 2 → 重複元環境の明示・10件以上の内部スクロール・Undo/削除時のエラー完全解除が完成
4. Add User Story 3 → カーソル変化・情報アイコン・キーボード操作・ライト/ダークモード最適化が完成
5. Polish → `DESIGN.md` 同期・日本語 JSDoc 点検・`npm run build` 検証ゲート通過

---

## Notes

- `[P]` タスクは異なるファイルを編集し、未完了タスクへの依存がないものを示す
- `[US1]`〜`[US3]` ラベルは [spec.md](./spec.md) の各ユーザーストーリーとのトレーサビリティを保証する
- `package/js/` および `package.zip` は直接編集せず、必ず `T014` の `npm run build` によって生成する
- オンボーディングツアー（`intro.js`）との互換性のため、保存ステータス要素の `id="save-status"` を維持する
