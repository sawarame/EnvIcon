# EnvIcon Agent Guidelines

## 概要

EnvIcon は、開発・ステージング・本番などの各環境を視覚的に識別しやすくするために、ブラウザの Favicon・ページ内バッジ・ツールバーアイコンを動的にカスタマイズする Chrome 拡張機能（Manifest V3）です。

---

## 参照ドキュメント（Single Source of Truth）

開発・設計・コード変更を行う際は、以下のドキュメントを基準としてください。

- **プロジェクト憲章（最上位規約・技術スタック・アーキテクチャ原則・コーディング規約）**: [.specify/memory/constitution.md](.specify/memory/constitution.md)
- **デザイン仕様書（UI テーマ・カラー・バッジ描画仕様・画面レイアウト）**: [DESIGN.md](DESIGN.md)
- **機能開発ワークフロー（Spec Kit）**: `.specify/`（新規機能・改修時の個別仕様書は `specs/` 配下で管理）

---

## ディレクトリ構造

- `src/`: TypeScript ソースコード、Vue コンポーネント、スタイル、マスター SVG
  - `background.ts`: サービスワーカー（ツールバーアイコンの動的描画、ストレージアクセス権限設定、画像取得プロキシ等）
  - `content.ts`: Web ページ注入スクリプト（初期データ読み込み・画面内URL遷移監視・ストレージ変更監視のオーケストレーター）
  - `options.ts`: オプション設定画面の Vue マウント用エントリーポイント
  - `popup.ts`: クイック操作ポップアップ画面の Vue マウント用エントリーポイント
  - `types.ts`: コンテキスト間で共有するインターフェース・型定義
  - `env.d.ts`: Vue SFC などのモジュール型定義
  - `features/`: ページ上で動作する各機能のモジュール（`favicon_changer.ts`, `page_badge_changer.ts`, `console_logger.ts`, `url_observer.ts`, `utils.ts`）
  - `options/`: オプション画面の Vue コンポーネント（`App.vue`, `components/`）、多言語辞書（`i18n.ts`）、スタイル（`App.css`）
  - `popup/`: ポップアップ画面の Vue コンポーネント（`PopupApp.vue`）
- `package/`: 拡張機能の配布パッケージ用ディレクトリ
  - `manifest.json`: Chrome 拡張機能マニフェスト（Manifest V3）
  - `options.html` / `popup.html`: 各画面のエントリー HTML
  - `_locales/`: 拡張機能メタデータの多言語リソース（`en`, `ja`）
  - `icons/`: 生成された PNG アイコンアセット（自動生成）
  - `js/`: Webpack によってビルドされた JavaScript バンドル（自動生成）
- `scripts/`: ビルド補助スクリプト（`generate-icons.js`）
- `.specify/`: Spec Kit のテンプレート・スクリプトおよびプロジェクト憲章（`memory/constitution.md`）

---

## 開発ワークフロー

- **ビルド**: `npm run build` を実行すると、`src/` のコードがコンパイル・バンドルされて `package/js/` に出力され、配布用の `package.zip` が生成されます。
- **アイコン生成**: `src/icon.svg` または `src/icon_dev.svg` を変更した場合は、`npm run generate-icons`（開発用は `npm run generate-icons:dev`）を実行して `package/icons/` を更新します。
- **検証**: コードや設定を変更した後は、必ず `npm run build` がエラーなく正常終了することを確認してください。

---

## 主要コーディング規約（抜粋）

詳細な原則および必須要件については必ず [.specify/memory/constitution.md](.specify/memory/constitution.md) を参照してください。

- **厳格な型定義**: TypeScript `strict: true` を遵守し、`any` 型の使用を禁止します。共有型は `src/types.ts` に集約します。
- **Vue 3 モダン構成**: すべての Vue コンポーネントは Composition API（`<script setup lang="ts">`）と PrimeVue v4（Aura テーマ、ライト/ダーク両対応）を使用します。
- **非同期処理**: Chrome API 等の非同期処理は `async/await` を基本とし、待機しない Promise 呼び出しには `void` を明示します。
- **日本語コメント・JSDoc 必須化**: すべてのクラス・関数・メソッドに日本語の JSDoc（概要・`@param`・`@returns`）を記述し、インラインコメントもすべて日本語で記述します。
- **生成物の保護**: `src/` 配下のソースを編集し、自動生成される `package/js/`、`package/icons/*.png`、`package.zip` は直接編集しないでください。
- **機能モジュール分離**: ページ上で動作する新機能を追加する場合は、`src/features/` 配下に独立モジュールとして実装してください。
