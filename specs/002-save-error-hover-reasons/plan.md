# 実装計画書 (Implementation Plan): 保存エラー表示時のマウスオーバーによる不備理由表示

**Branch**: `002-save-error-hover-reasons` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-save-error-hover-reasons/spec.md`

## Summary

オプション設定画面の下部固定フッターに「入力内容に不備があるため保存されていません」が表示されている際、マウスオーバー（およびキーボードフォーカス）によって **どの環境の・どの項目が・どのような理由で保存できないのか（パターン重複時は競合先の環境名を含む）** を即座に一覧確認できるホバーポップオーバー機能を実装する。

技術的には、これまで `src/options/App.vue` 内に密結合していた保存前バリデーション処理を言語非依存の純粋関数 `validateEnvironments`（`src/options/utils.ts`）として分離し、全7種の不備区分と重複元環境情報を構造化モデル `ValidationErrorItem`（`src/types.ts`）として生成する。UI 側は専用コンポーネント `src/options/components/SaveStatusIndicator.vue` を新設し、固定フッターの `#save-status` 直上に `bottom: calc(100% + 10px)` で展開するホバー維持・内部縦スクロール対応の吹き出しを描画する。あわせて編集取り消し（Undo）や手動復元で直前の保存済み状態に戻った際のエラーステータス残留防止を統合する。

## Technical Context

**Language/Version**: TypeScript 5.9 (`target: ES2020`, `moduleResolution: "bundler"`, `strict: true`)

**Primary Dependencies**: Vue 3.5 (`<script setup lang="ts">`), PrimeVue 4.5 (`@primeuix/themes` Aura プリセット), PrimeIcons 7.0, Intro.js 8.3, Webpack 5.105

**Storage**: Chrome Storage API 3層構成（本機能による永続化スキーマ変更なし。検証エラー項目はオプション画面内のランタイム状態として管理）

**Testing**: `npm run build` による TypeScript 厳格型検査・Webpack 本番バンドル検証、および Chrome デベロッパーモードでのエンドツーエンド検証シナリオ（[quickstart.md](./quickstart.md)）

**Target Platform**: Google Chrome（Manifest V3 拡張機能 — Options UI）

**Project Type**: Browser Extension（Vue 3 Extension Options Page）

**Performance Goals**: 環境配列に対する一括バリデーション・重複解析 1ms 未満、言語切り替え時の吹き出し再描画即時（0ms リアクティブ更新）、マウスオーバーから 3秒以内の原因特定（`SC-001`）

**Constraints**: 新規外部ライブラリの追加禁止、オンボーディングツアー（`intro.js`）が参照する `#save-status` DOM ID の維持、既存の保存検証ルールおよび個別入力欄の `.p-invalid` 赤枠強調との 100% 一致保証

**Scale/Scope**: Options UI コンテキスト中心の改修（既存4ファイルの更新 ＋ 新規1 Vue コンポーネントの追加）、全7種の検証エラー対応、日英2言語辞書および `DESIGN.md` の同期更新

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 事前ゲート検証（Pre-Phase 0）および設計後再検証（Post-Phase 1）

| 憲章原則 | 検証ステータス | 適合内容の確認 |
| :--- | :---: | :--- |
| **I. コンテキスト分離と機能モジュール化** | **PASS** | Background / Content / Popup コンテキストへの影響なし。共有型は `src/types.ts` に集約し、検証純粋関数は `src/options/utils.ts`、保存ステータス・吹き出し表示は `src/options/components/SaveStatusIndicator.vue` へ明確に責務分離する。 |
| **II. 3層ストレージ管理とリアルタイム同期** | **PASS** | `chrome.storage.sync` のスキーマおよび 500ms デバウンス保存を維持しつつ、事前バリデーションと直前保存状態復帰時の即時エラー解除を強化して不正データの保存を確実に防止する。 |
| **III. 非破壊的なページ介入と復元保証** | **PASS** | ホストページへ注入される Content Script や DOM オーバーレイには一切変更を加えない。 |
| **IV. 厳格な型安全性と Vue 3 モダン規約** | **PASS** | `strict: true`・`any` 型禁止を徹底。新規コンポーネントは `<script setup lang="ts">` で記述し、PrimeVue v4 Aura テーマ変数と PrimeIcons を用いてライト/ダーク両モードの視認性を確保。全表示文言は `src/options/i18n.ts` に日英定義しハードコードを排除する。 |
| **V. 日本語ドキュメンテーションと仕様同期** | **PASS** | すべての新規・更新関数に日本語 JSDoc（概要・`@param`・`@returns`）と日本語コメントを記述し、保存エラー吹き出しの視覚・挙動仕様を `DESIGN.md`（3.3節）へ同期更新する。 |
| **必須ビルド検証ゲート** | **PASS** | 新規パッケージ追加なし。実装完了時に `npm run build` の正常終了および `package.zip` 生成を必須ゲートとする。 |

> **判定結果**: 全ゲート **PASS**（未解決の `NEEDS CLARIFICATION` および憲章違反なし）。

## Project Structure

### Documentation (this feature)

```text
specs/002-save-error-hover-reasons/
├── spec.md                              # 機能仕様書 (/speckit-specify, /speckit-clarify 出力)
├── checklists/
│   └── requirements.md                  # 仕様品質検証チェックリスト (/speckit-specify 出力)
├── plan.md                              # 本実装計画書 (/speckit-plan 出力)
├── research.md                          # Phase 0 技術調査・設計判断書 (/speckit-plan 出力)
├── data-model.md                        # Phase 1 データモデル設計書 (/speckit-plan 出力)
├── quickstart.md                        # Phase 1 検証・クイックスタートガイド (/speckit-plan 出力)
├── contracts/                           # Phase 1 インターフェース・UI契約 (/speckit-plan 出力)
│   └── validation-and-popover-ui.md
└── tasks.md                             # Phase 2 タスク分解書 (/speckit-tasks で作成予定)
```

### Source Code (repository root)

```text
src/
├── types.ts                                     # [更新] ValidationErrorKind, ValidationErrorItem, EnvironmentsValidationResult 型定義の追加
├── background.ts                                # [変更なし]
├── content.ts                                   # [変更なし]
├── options.ts                                   # [変更なし]
├── popup.ts                                     # [変更なし]
├── features/                                    # [変更なし]
├── options/
│   ├── App.vue                                  # [更新] validateEnvironments の利用、errorItems 状態保持、直前保存状態一致時のエラー残留解消、SaveStatusIndicator の組み込み
│   ├── App.css                                  # [必要に応じ微調整] フッター周りの共通ユーティリティ整理（コンポーネント固有スタイルは scoped CSS に配置）
│   ├── i18n.ts                                  # [更新] パラメータ補間対応 t(key, params) の拡張、全7種エラー理由・代替環境名・重複表示の日英翻訳キー追加
│   ├── utils.ts                                 # [更新] 純粋検証関数 validateEnvironments（7種エラー抽出＋重複元環境追跡）および環境表示名解決ヘルパーの追加
│   └── components/
│       ├── SaveStatusIndicator.vue              # [新規] #save-status 表示およびホバー維持・内部スクロール・キーボード対応の不備理由ポップオーバーコンポーネント
│       ├── EnvSection.vue                       # [変更なし] 既存の validationError prop による赤枠強調をそのまま利用
│       └── HostnameList.vue                     # [変更なし] 既存の invalidIndices prop による赤枠強調をそのまま利用
└── popup/
    └── PopupApp.vue                             # [変更なし]

DESIGN.md                                        # [更新] 3.3節「自動保存ステータスとバリデーション表現」にホバー吹き出し仕様を追記
```

**Structure Decision**: 既存の Manifest V3 マルチエントリ構成を維持し、変更範囲を `src/types.ts` と `src/options/` 配下に限定する。肥大化しやすい `src/options/App.vue` にポップオーバーのホバータイマー制御やエラー一覧レンダリングを直接書き足すのではなく、純粋検証ロジックを `src/options/utils.ts` に、ステータスおよび吹き出しUIを `src/options/components/SaveStatusIndicator.vue` に分離することで、保守性と型安全性を高める。

## Complexity Tracking

憲章（`constitution.md`）への違反や正当化を要する追加的複雑性は存在しないため、該当項目なし。
