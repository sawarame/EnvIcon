# 実装計画書 (Implementation Plan): オプション設定画面のUIレイアウト刷新と操作性向上

**Branch**: `003-options-ui-redesign` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-options-ui-redesign/spec.md`

## Summary

オプション設定画面（Options UI）における既存の過密な3カラム設定グリッドを廃止し、**「左カラム: バッジ外観と表示設定」** と **「右カラム: 対象URLパターン一覧」** による直感的でゆとりのある左右2カラム階層レイアウトへ刷新する。
あわせて、文字・カラー変更を保存前に即座に確認できる「リアルタイムプレビュー領域」、ページ内バッジOFF時に不要な位置・サイズ設定を隠す「スマート連動・スリム化」、初心者のつまずきを防ぐ「URL書き方ヒント（ポート・パス対応）」、およびスクロール時にも環境を一目で判別できる「ヘッダーミニバッジ・ルール件数表示」を統合する。

技術的には既存の Chrome Storage（`EnvironmentConfig`）のスキーマを変更することなく、`src/options/components/EnvSection.vue`、`src/options/components/HostnameList.vue`、`src/options/App.css`、および `src/options/i18n.ts` を中心にUIコンポーネントとスタイルの構造改革を行い、`DESIGN.md` の仕様も同期更新する。

## Technical Context

**Language/Version**: TypeScript 5.9 (`target: ES2020`, `moduleResolution: "bundler"`, `strict: true`)

**Primary Dependencies**: Vue 3.5 (`<script setup lang="ts">`), PrimeVue 4.5 (`@primeuix/themes` Aura プリセット), PrimeIcons 7.0, Webpack 5.105

**Storage**: Chrome Storage API 3層構成（永続化データ構造の破壊的変更なし。UI状態の算出・表示制御のみを追加）

**Testing**: `npm run build` による TypeScript 厳格型検査・Webpack 本番バンドル検証、および Chrome デベロッパーモードでのエンドツーエンド検証シナリオ（[quickstart.md](./quickstart.md)）

**Target Platform**: Google Chrome（Manifest V3 拡張機能 — Options UI）

**Project Type**: Browser Extension（Vue 3 Extension Options Page）

**Performance Goals**: バッジ文字・カラー変更時のプレビュー反映遅延 0ms（リアクティブスタイルバインディングによる即時追従、`SC-001`）、ページ内バッジOFF時の縦幅約30%削減（`SC-002`）、URLパターン入力欄の表示可能文字数約1.5倍拡大（`SC-003`）

**Constraints**: 新規外部ライブラリの追加禁止、PrimeVue v4 Aura テーマおよび CSS 変数（ライト/ダーク両モード）との一貫性維持、既存の500msデバウンス自動保存およびURLチェッカー（`.match-success`）との完全な互換性保証

**Scale/Scope**: Options UI コンテキストの改修（既存4ファイルの更新: `EnvSection.vue`, `HostnameList.vue`, `App.css`, `i18n.ts`、および `DESIGN.md` の同期）、全7つの受入シナリオ対応

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 事前ゲート検証（Pre-Phase 0）および設計後再検証（Post-Phase 1）

| 憲章原則 | 検証ステータス | 適合内容の確認 |
| :--- | :---: | :--- |
| **I. コンテキスト分離と機能モジュール化** | **PASS** | Background / Content / Popup コンテキストへの悪影響なし。変更は `src/options/` 配下のUIコンポーネントおよびスタイル定義に完全に閉じており、モジュール境界を遵守する。 |
| **II. 3層ストレージ管理とリアルタイム同期** | **PASS** | `EnvironmentConfig` のスキーマ変更を行わず、既存の `chrome.storage.sync` の保存機構（500msデバウンス、事前バリデーション）をそのまま維持する。 |
| **III. 非破壊的なページ介入と復元保証** | **PASS** | Webページへ注入される Content Script や DOM 操作には一切変更を加えない。 |
| **IV. 厳格な型安全性と Vue 3 モダン規約** | **PASS** | `strict: true`・`any` 型禁止を維持。すべてのコンポーネントは `<script setup lang="ts">` で記述し、PrimeVue v4 コンポーネントと PrimeIcons を使用。全表示文言は `src/options/i18n.ts` で日英定義しハードコードを排除する。 |
| **V. 日本語ドキュメンテーションと仕様同期** | **PASS** | すべての新規・更新関数に日本語 JSDoc（概要・`@param`・`@returns`）と日本語コメントを記述し、新レイアウト仕様・プレビュー仕様を `DESIGN.md`（3.2節）へ同期更新する。 |
| **必須ビルド検証ゲート** | **PASS** | 実装完了時に `npm run build` を実行し、TypeScript 型チェック・Webpack バンドル・`package.zip` 生成が正常に完了することを検証ゲートとする。 |

> **判定結果**: 全ゲート **PASS**（憲章違反および未解決事項なし）。

## Project Structure

### Documentation (this feature)

```text
specs/003-options-ui-redesign/
├── spec.md                              # 機能仕様書 (/speckit-specify 出力)
├── checklists/
│   └── requirements.md                  # 仕様品質検証チェックリスト (/speckit-specify 出力)
├── plan.md                              # 本実装計画書 (/speckit-plan 出力)
├── research.md                          # Phase 0 技術調査・設計判断書 (/speckit-plan 出力)
├── data-model.md                        # Phase 1 データモデル・UI状態設計書 (/speckit-plan 出力)
├── quickstart.md                        # Phase 1 動作確認・検証手順書 (/speckit-plan 出力)
└── contracts/
    └── options-ui-contracts.md          # Phase 1 コンポーネント・インターフェース契約書 (/speckit-plan 出力)
```

### Source Code (repository root)

```text
src/
├── options/
│   ├── components/
│   │   ├── EnvSection.vue               # 更新: 左右2カラム構造、プレビュー領域、トグル連動、ヘッダーミニバッジ・件数
│   │   ├── HostnameList.vue             # 更新: 右カラムレイアウト、見出し・ヒント表示、行内要素配置
│   │   └── SaveStatusIndicator.vue      # 既存維持: 保存ステータス表示
│   ├── App.css                          # 更新: 左右2カラムグリッド、プレビュー、ヒント、レスポンシブスタイル
│   ├── i18n.ts                          # 更新: プレビュー、ヒント、ルール件数等の日英辞書キー追加
│   └── App.vue                          # 既存維持: オーケストレーター
└── types.ts                             # 既存維持: 共通型定義
DESIGN.md                                # 更新: 3.2節の環境設定カードデザイン仕様を新レイアウトへ同期
```

**Structure Decision**: 単一プロジェクト構造（Single project）を継続採用し、`src/options/` 配下のコンポーネントおよびスタイルを改修する。

## Complexity Tracking

> **憲章違反なし。特別な複雑性の正当化は不要。**

| 項目 | 判断 | 理由 |
| :--- | :--- | :--- |
| 新規ライブラリ追加 | なし | 既存の PrimeVue v4、PrimeIcons、Vue 3 リアクティビティで全要件を完結。 |
| ストレージスキーマ変更 | なし | 既存のデータモデル（`EnvironmentConfig`）をそのまま使用し、データ移行リスクを排除。 |
