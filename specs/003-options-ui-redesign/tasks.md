# Tasks: オプション設定画面のUIレイアウト刷新と操作性向上 (Options UI Redesign)

**Input**: Design documents from `/specs/003-options-ui-redesign/`
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/options-ui-contracts.md](./contracts/options-ui-contracts.md), [quickstart.md](./quickstart.md)

**Tests**: 自動テストは既存プロジェクト構成にないため、`npm run build` の厳格型検査および `quickstart.md` によるブラウザ検証シナリオを実施します。

**Organization**: 各ユーザーストーリー（US1, US2, US3）ごとに独立して実装・検証可能なフェーズ構成となっています。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（別ファイルかつ未完了タスクに非依存）
- **[Story]**: 対象ユーザーストーリー（US1, US2, US3）
- 説明文には対象ファイルの絶対/相対パスを明記

---

## Phase 1: Setup (共通基盤・準備)

**Purpose**: 多言語辞書キーの追加およびレイアウト用共通 CSS クラスの準備

- [x] T001 `src/options/i18n.ts` にバッジプレビュー・URLヒント・ルール件数表記に関する日英辞書キー（`badgePreview`, `previewFaviconLabel`, `previewPageBadgeLabel`, `urlPatternsHint`, `rulesCountSingular`, `rulesCountPlural`）を定義
- [x] T002 [P] `src/options/App.css` に新2カラムレイアウト（`.env-card-two-columns`）、リアルタイムプレビュー枠（`.badge-live-preview`）、ヘッダーミニバッジ（`.env-header-mini-badge`）用のベーススタイルを定義

---

## Phase 2: Foundational (前提タスク)

**Purpose**: プレビュー描画および状態算出のための基盤ロジック準備

- [x] T003 `src/options/components/EnvSection.vue` にプレビュー描画用のスタイル算出プロパティ（`previewFaviconStyle`, `previewPageBadgeStyle`）および表示用フォールバック文字算出ロジックを実装

**Checkpoint**: 共通スタイル・辞書・プレビュー算出ロジックが準備完了し、ユーザーストーリーの実装を開始可能

---

## Phase 3: User Story 1 - 左右2カラム構成とリアルタイムプレビューによる直感的な環境バッジ設定 (Priority: P1) 🎯 MVP

**Goal**: カード内を左右2カラム（左: バッジ外観と表示設定 / 右: 対象URLパターン一覧）へ再構築し、文字・カラー変更時に即座に反映されるリアルタイムプレビューを提供する。

**Independent Test**: 任意の環境でバッジ文字やカラーを変更した際にプレビューが即座に連動更新され、右カラムにURLパターン一覧が配置されて正常に保存されることを確認。

- [x] T004 [US1] `src/options/components/EnvSection.vue` のテンプレートを既存の3カラムグリッドから左右2カラム構造（左カラム: バッジ設定 / 右カラム: URLパターン一覧）へ再構築
- [x] T005 [US1] `src/options/components/EnvSection.vue` の左カラム上部に Favicon 風アイコンおよびページ内バッジ風テキストを表示するリアルタイムプレビュー領域（`.badge-live-preview`）を実装
- [x] T006 [US1] `src/options/App.css` に左右2カラムグリッドのレスポンシブスタイル（PC表示: 2カラム `minmax(320px, 1fr) minmax(380px, 1.2fr)` / 画面幅960px以下: 1カラム縦積み）を実装

**Checkpoint**: User Story 1 の左右2カラムおよびプレビューが独立して動作・検証可能（MVP達成）

---

## Phase 4: User Story 2 - 機能トグルの状態に応じた付随設定のスマート連動 (Priority: P2)

**Goal**: Favicon / ページ内バッジ / コンソールログのトグルを左カラム内に整理し、ページ内バッジが無効（OFF）の際は表示位置・文字サイズ設定を非表示にして縦幅をスリム化する。

**Independent Test**: ページ内バッジのトグルをOFFにした際に位置やサイズ設定が非表示となり、ONに戻すと元の設定値を維持したまま再表示されることを確認。

- [x] T007 [US2] `src/options/components/EnvSection.vue` の左カラム内に機能トグル群（Favicon / ページ内バッジ / コンソールログ）を分かりやすい行形式で配置
- [x] T008 [US2] `src/options/components/EnvSection.vue` において、`pageBadgeEnabled` のトグル状態に応じて表示位置（Select）および文字サイズ（InputNumber）の表示/非表示を動的に切り替える連動ロジックとスタイルを実装

**Checkpoint**: User Story 1 および User Story 2 が連動して動作・検証可能

---

## Phase 5: User Story 3 - URLパターンの書き方ヒントとヘッダー識別バッジによる一覧性向上 (Priority: P3)

**Goal**: 右カラム上部にポート・パス対応のヒント文を表示し、各環境カードのヘッダーに現在のバッジ文字・色ミニピルと登録パターン件数を常時表示する。

**Independent Test**: 右カラム上部にヒント文が表示され、各カードのヘッダーに現在のバッジ色・文字および登録パターン件数が表示され、行の追加・削除に連動して件数が更新されることを確認。

- [x] T009 [US3] `src/options/components/HostnameList.vue` の上部に見出しとポート・パス対応の書き方ヒント文（`urlPatternsHint`）を追加し、行レイアウトの余白および入力欄の横幅を最適化
- [x] T010 [US3] `src/options/components/EnvSection.vue` のカードヘッダー（タイトル横）に現在のバッジ文字・色を反映したピル型ミニバッジ（`.env-header-mini-badge`）と登録パターン件数バッジ（`.env-header-rules-badge`）を実装
- [x] T011 [US3] `src/options/components/EnvSection.vue` において、URLパターンの追加・削除・編集時にヘッダーの登録パターン件数表示がリアルタイムに更新される算出プロパティを実装

**Checkpoint**: すべてのユーザーストーリー（US1, US2, US3）の実装が完了

---

## Phase 6: Polish & Cross-Cutting Concerns (仕上げ・検証)

**Purpose**: ドキュメント同期、ビルド検証、およびエンドツーエンド動作確認

- [x] T012 [P] `DESIGN.md` の 3.2 節（環境設定カード）を新レイアウト（左右2カラム、プレビュー、トグル連動、ヒント、ミニバッジ）の仕様に合わせて同期更新
- [x] T013 `npm run build` を実行し、TypeScript の厳格型検査・Webpack 本番バンドルおよび `package.zip` 生成がエラーなく完了することを確認
- [x] T014 `specs/003-options-ui-redesign/quickstart.md` の検証シナリオ（全6シナリオ: 2カラム表示、レスポンシブ、プレビュー、トグル連動、URLヒント・行入力、ヘッダーバッジ、多言語・テーマ切り替え）を実行してエンドツーエンドの品質を確認

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存関係なし。直ちに開始可能。
- **Foundational (Phase 2)**: Phase 1 完了後に実施。全ユーザーストーリーの前提。
- **User Story 1 (Phase 3)**: Phase 2 完了後に実施。2カラムおよびプレビューのMVP。
- **User Story 2 (Phase 4)**: Phase 3 完了後に実施。左カラムのトグル整理・スリム化。
- **User Story 3 (Phase 5)**: Phase 3 完了後に実施（右カラムおよびヘッダー強化）。
- **Polish (Phase 6)**: 全ユーザーストーリー完了後に実施。

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完了後に即座に開始可能。
- **User Story 2 (P2)**: User Story 1 の左カラムレイアウト完了後に着手。
- **User Story 3 (P3)**: User Story 1 の左右2カラムレイアウト完了後に着手。
- **US2 と US3**: 左カラムと右カラム/ヘッダーで対象領域が分離されているため、並行実装も可能。

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1（Setup: 辞書キー & スタイル基盤）を実行
2. Phase 2（Foundational: プレビュースタイル算出）を実行
3. Phase 3（User Story 1: 左右2カラム & プレビュー）を実行
4. **ここで検証**: 左右2カラム化とプレビューが正常に機能することを確認（MVP完成）

### Incremental Delivery

1. MVP完成後、Phase 4（User Story 2: トグル連動・スリム化）を追加し、不要な設定項目が隠れることを確認
2. 次に Phase 5（User Story 3: URLヒント & ヘッダー識別バッジ）を追加し、操作性・一覧性の向上を確認
3. 最後に Phase 6（Polish: DESIGN.md 同期 & ビルド・全シナリオ検証）を実施して完了
