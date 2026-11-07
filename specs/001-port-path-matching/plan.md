# 実装計画書 (Implementation Plan): ポート番号・URLパス対応の環境マッチング

**Branch**: `001-port-path-matching` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-port-path-matching/spec.md`
## Summary

従来ホスト名（`hostname`）単体に限定されていた環境判定ロジックを拡張し、既存の1行入力UIと保存データ互換性を維持したまま **ポート番号（例: `localhost:3000`）およびURLパス（例: `example.com/stg`）を含む環境マッチング** を実現する。
技術的には、`src/features/utils.ts` に構造化URLパターン解析・正規化および詳細度比較（深いパス ＞ ポート指定 ＞ ホスト名のみ、通常パターン ＞ 正規表現、ならびに既存ホスト正規表現の後方互換判定）を集約し、SPA における画面内パス遷移は `src/background.ts` の `chrome.tabs.onUpdated` 通知と新規独立モジュール `src/features/url_observer.ts` によってホストページ非破壊でリアルタイム追従させる。あわせてクイック操作ポップアップの `ホスト[:ポート]` 単位化・誤編集防止ロック表示、および URL チェッカーの採用1行ハイライトを統合する。

## Technical Context

**Language/Version**: TypeScript 5.9 (`target: ES2020`, `moduleResolution: "bundler"`, `strict: true`)

**Primary Dependencies**: Vue 3.5 (`<script setup lang="ts">`), PrimeVue 4.5 (`@primeuix/themes` Aura プリセット), PrimeIcons 7.0, Intro.js 8.3, Webpack 5.105

**Storage**: Chrome Storage API 3層構成（`chrome.storage.sync`: 環境・URLパターン設定、`chrome.storage.local`: 表示言語・ダークモード・ツアー状態、`chrome.storage.session`: 全体および `ホスト[:ポート]` 単位の一時OFF状態）

**Testing**: `npm run build` による TypeScript 厳格型検査・Webpack バンドル検証、および Chrome デベロッパーモードでのエンドツーエンド検証シナリオ（[quickstart.md](./quickstart.md)）

**Target Platform**: Google Chrome（Manifest V3 拡張機能）

**Project Type**: Browser Extension（Service Worker + Content Script + Vue 3 Extension Pages）

**Performance Goals**: 単一URLに対するマッチング・優先度評価 1ms 未満、SPA 画面内パス遷移から Favicon・ページ内バッジ・ツールバーアイコン反映まで 1秒以内（`SC-004`）

**Constraints**: 合理的な理由と憲章改定なしの新規依存ライブラリ追加禁止、ホストページの DOM / `History` グローバル環境への破壊的介入禁止、既存の `chrome.storage.sync` 保存データに対する移行なしでの 100% 後方互換性維持

**Scale/Scope**: 4つの実行コンテキスト（Background / Content / Options / Popup）、既存8ファイルの改修＋新規1機能モジュール（`src/features/url_observer.ts`）の追加、日英2言語辞書および `DESIGN.md` の同期更新

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 事前ゲート検証（Pre-Phase 0）および設計後再検証（Post-Phase 1）

| 憲章原則 | 検証ステータス | 適合内容の確認 |
| :--- | :---: | :--- |
| **I. コンテキスト分離と機能モジュール化** | **PASS** | `src/content.ts` は薄いオーケストレーターを維持し、SPA URL変化監視は `src/features/url_observer.ts` に分離。`console_logger.ts` にも `refresh*` を追加し、共有型・メッセージ型はすべて `src/types.ts` に一元定義する。 |
| **II. 3層ストレージ管理とリアルタイム同期** | **PASS** | `sync`（環境定義・500msデバウンス保存）、`local`（UI設定）、`session`（ブラウザ再起動で自動復帰する一時OFF）の役割分担を厳守し、`storage.onChanged` によるリロード不要の即時反映を維持する。 |
| **III. 非破壊的なページ介入と復元保証** | **PASS** | ホストページの `History.prototype` 書き換え（Main World 注入）を行わず、`chrome.tabs.onUpdated` メッセージ通知と Isolated World 内の `popstate` 監視で非破壊検知する。対象外パス遷移時は元の Favicon とバッジなし DOM へ完全復元する。 |
| **IV. 厳格な型安全性と Vue 3 モダン規約** | **PASS** | `strict: true`・プロダクションコードでの `any` 禁止・Vue 3 `<script setup lang="ts">`・PrimeVue v4・`async/await` と未待機 Promise への `void` 明示・`i18n.ts` 日英完全定義を遵守する。 |
| **V. 日本語ドキュメンテーションと仕様同期** | **PASS** | すべての関数・メソッドへ日本語 JSDoc（概要・`@param`・`@returns`）と日本語コメントを記述し、ポップアップ・チェッカー仕様の拡張にあわせて `DESIGN.md`（および関連仕様書）を同期更新する。 |
| **必須ビルド検証ゲート** | **PASS** | 新規パッケージ追加なし。実装完了時に `npm run build` の正常終了および `package.zip` 生成を必須ゲートとする。 |

> **判定結果**: 全ゲート **PASS**（未解決の `NEEDS CLARIFICATION` および憲章違反なし）。

## Project Structure

### Documentation (this feature)

```text
specs/001-port-path-matching/
├── spec.md              # 機能仕様書 (/speckit-specify 出力)
├── checklists/
│   └── requirements.md  # 仕様品質検証チェックリスト (/speckit-specify 出力)
├── plan.md              # 本実装計画書 (/speckit-plan 出力)
├── research.md          # Phase 0 技術調査・設計判断書 (/speckit-plan 出力)
├── data-model.md        # Phase 1 データモデル設計書 (/speckit-plan 出力)
├── quickstart.md        # Phase 1 検証・クイックスタートガイド (/speckit-plan 出力)
├── contracts/           # Phase 1 インターフェース契約群 (/speckit-plan 出力)
│   ├── url-pattern-matching.md
│   └── messaging-and-storage.md
└── tasks.md             # Phase 2 タスク分解書 (/speckit-tasks で作成予定)
```

### Source Code (repository root)

```text
src/
├── types.ts                         # [更新] TargetLocation, ParsedUrlPattern, EnvMatchDetail拡張, URL_CHANGEDメッセージ型定義
├── background.ts                    # [更新] フルURL対応アイコン評価、tabs.onUpdatedからのURL_CHANGEDメッセージ送信
├── content.ts                       # [更新] url_observerの初期化とURL変化・ストレージ変化時の全feature一括refresh連携
├── options.ts                       # [変更なし] Options画面エントリーポイント
├── popup.ts                         # [変更なし] Popup画面エントリーポイント
├── features/
│   ├── utils.ts                     # [更新] URLパターン正規化・検証、TargetLocation解析、詳細度優先マッチング、ホスト[:ポート]一時OFF判定
│   ├── url_observer.ts              # [新規] SPA画面内遷移（URL_CHANGEDメッセージ + popstate）を監視しパス変化時に再評価を発火するモジュール
│   ├── favicon_changer.ts           # [更新] window.location.href ベースの評価・一時OFF判定への移行
│   ├── page_badge_changer.ts        # [更新] window.location.href ベースの評価・一時OFF判定への移行
│   └── console_logger.ts            # [更新] refreshConsoleLoggerFeatureの追加と前回出力環境ID保持による重複ログ防止
├── options/
│   ├── App.vue                      # [更新] パターン保存時の構造化正規化・重複検証、URLチェッカーの共通マッチング化と採用1行インデックス受け渡し
│   ├── i18n.ts                      # [更新] プレースホルダー・エラー文言・ポップアップ汎用パターンロック文言の日英定義更新
│   ├── utils.ts                     # [更新] パターン入力バリデーション・正規化ヘルパーの連携整理
│   └── components/
│       ├── EnvSection.vue           # [更新] URLチェッカーの採用パターンインデックスprop受け渡しと型安全化
│       └── HostnameList.vue         # [更新] 採用1行のみのハイライト表示、プレースホルダー更新、型安全化
└── popup/
    └── PopupApp.vue                 # [更新] ホスト[:ポート]単位の表示・割り当て・解除・一時OFF、および非完全一致時のパターンロック案内表示

package/
├── manifest.json                    # [変更なし] 権限変更不要（既存の storage + <all_urls> で動作）
├── options.html                     # [変更なし]
├── popup.html                       # [変更なし]
└── _locales/{en,ja}/messages.json   # [確認・必要に応じ更新]

DESIGN.md                            # [更新] ポップアップのホスト[:ポート]表示およびパターン一致ロック表示仕様の同期反映
```

**Structure Decision**: 既存の Manifest V3 マルチエントリ構成（`src/` 実装ディレクトリ ＋ `package/` 配布ディレクトリ）をそのまま継承する。ページ内での URL 変化検知ロジックは憲章原則 I に従い `src/features/url_observer.ts` として独立モジュール化し、URL 解析・優先度判定のコアロジックは全コンテキストから参照可能な純粋関数群として `src/features/utils.ts` に集約する。

## Complexity Tracking

憲章（`constitution.md`）への違反や正当化を要する追加的複雑性は存在しないため、該当項目なし。
