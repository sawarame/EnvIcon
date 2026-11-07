<!--
Sync Impact Report
- Version change: [CONSTITUTION_VERSION] (未初期化テンプレート) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. コンテキスト分離と機能モジュール化 (Context Isolation & Feature Modularity)
  - [PRINCIPLE_2_NAME] → II. 3層ストレージ管理とリアルタイム同期 (Three-Tier Storage & Reactive Sync)
  - [PRINCIPLE_3_NAME] → III. 非破壊的なページ介入と復元保証 (Non-Destructive DOM & State Restoration)
  - [PRINCIPLE_4_NAME] → IV. 厳格な型安全性と Vue 3 モダン規約 (Strict Type Safety & Vue 3 Standards)
  - [PRINCIPLE_5_NAME] → V. 日本語ドキュメンテーションと仕様同期 (Japanese Documentation & Spec Sync)
- Added sections:
  - 技術スタックおよびアーキテクチャ制約 (旧 [SECTION_2_NAME])
  - コーディング規約および開発ワークフロー (旧 [SECTION_3_NAME])
- Removed sections: なし
- Templates / docs status:
  - すべてのプレースホルダートークンを解消済み（未解決 TODO なし）
  - 関連ドキュメント連携: `AGENTS.md`（エージェント向けガイドライン）および `DESIGN.md`（UI・バッジ描画デザイン仕様）と参照関係を同期済み
-->
# EnvIcon Constitution

## Core Principles

### I. コンテキスト分離と機能モジュール化 (Context Isolation & Feature Modularity)

拡張機能の各実行コンテキスト（`src/background.ts`、`src/content.ts`、`src/options.ts`、`src/popup.ts`）は責務を明確に分離しなければならない（MUST）。

- `src/content.ts` はストレージの初期読み込みと変更イベントの購読のみを担う薄いオーケストレーターとして保ち、個別のドメイン機能ロジックを直接記述してはならない（MUST NOT）。
- Web ページ上で動作する各機能（Favicon 書き換え、ページ内バッジ表示、コンソールログ出力、ホスト名判定等）は `src/features/` 配下に独立したモジュールとして実装し、初期化関数（`initialize*`）および再評価関数（`refresh*`）を公開しなければならない（MUST）。
- コンテキスト間で共有するデータ構造・ストレージ型・メッセージング契約はすべて `src/types.ts` に一元定義しなければならない（MUST）。
- CORS 制約を受ける外部リソース取得やブラウザタブ情報の参照は、コンテンツスクリプト内で無理に処理せず、`chrome.runtime.onMessage` を介して `src/background.ts`（Service Worker）へ委譲しなければならない（MUST）。

**根拠**: Manifest V3 の実行境界（Service Worker・Content Script・Extension Pages）における権限とライフサイクルの違いを安全に吸収し、機能追加や変更時の影響範囲を最小化するため。

### II. 3層ストレージ管理とリアルタイム同期 (Three-Tier Storage & Reactive Sync)

状態データは用途とライフサイクルに応じて Chrome Storage の3領域を厳密に使い分けなければならない（MUST）。

- `chrome.storage.sync`: 環境設定リスト（`environments: EnvironmentConfig[]`）の永続化およびブラウザ間同期にのみ使用する。デフォルト環境（`prod`、`stg`、`dev`）は `isDeletable: false` として削除から保護しなければならない（MUST）。
- `chrome.storage.local`: 表示言語（`language`）、テーマ設定（`darkMode`）、オンボーディング完了状態など、端末・ブラウザ固有の UI 設定の保存に使用する。
- `chrome.storage.session`: 全体一時OFF（`globalDisabled`）およびサイト単位の一時OFF（`disabledHostnames`）の保存に使用する。`TRUSTED_AND_UNTRUSTED_CONTEXTS` アクセスレベルを設定し、ブラウザ再起動時に自動クリア（ON状態へ自動復帰）される設計を維持しなければならない（MUST）。
- ストレージの更新は `chrome.storage.onChanged` を通じて監視し、ページリロードを伴わずに Favicon・ページ内バッジ・ツールバーアイコンへ即座に反映させなければならない（MUST）。
- UI からの連続的な `chrome.storage.sync` 書き込みにはデバウンス処理（標準 500ms）と事前バリデーションを適用し、不正データの保存および書き込みクォータ超過を防止しなければならない（MUST）。

**根拠**: Sync ストレージの容量・頻度制限を守りつつ、一時ミュートの戻し忘れ防止とリアルタイムな操作感を実現するため。

### III. 非破壊的なページ介入と復元保証 (Non-Destructive DOM & State Restoration)

`<all_urls>` で任意の Web サイトに注入されるスクリプトとして、ホストページの DOM 構造・スタイル・ユーザー操作を決して阻害してはならない（MUST NOT）。

- ページ内に挿入するバッジ等のオーバーレイ要素には `pointer-events: none` および `user-select: none` を必ず適用し、ホストページのクリックやテキスト選択を妨げてはならない（MUST NOT）。
- サイト本来の `<link rel="icon">` 要素を無効化・置換する際は元の属性（`data-original-rel` 等）を保持し、一時OFFへの切り替えや環境登録解除時にはページリロードなしで元の Favicon と DOM 状態を完全に復元しなければならない（MUST）。
- SPA 遷移やサイト側の動的な Favicon 変更を `MutationObserver` 等で監視する際は、リクエスト ID による非同期世代管理と前回適用結果の差分比較を行い、競合状態（Race Condition）や無限再描画ループを防止しなければならない（MUST）。

**根拠**: 開発・検証・本番のあらゆる業務 Web アプリケーション上で常駐する拡張機能において、ホストサイトの動作安全性が最優先の品質要件であるため。

### IV. 厳格な型安全性と Vue 3 モダン規約 (Strict Type Safety & Vue 3 Standards)

すべてのフロントエンドおよびバックグラウンド実装は、厳格な TypeScript 型検査と統一された Vue 3 コンポーネント設計に従わなければならない（MUST）。

- `tsconfig.json` の `strict: true` を維持し、プロダクションコードにおける `any` 型の使用を禁止する（MUST NOT）。外部入力（JSON インポート等）や例外ハンドリングでは `unknown` 型と型ガードを使用しなければならない（MUST）。
- Options 画面および Popup 画面のすべての Vue コンポーネントは Vue 3 Composition API（`<script setup lang="ts">`）で記述しなければならず（MUST）、Options API を新規に使用してはならない（MUST NOT）。
- UI コンポーネントは PrimeVue v4（`@primeuix/themes` の Aura プリセット）と PrimeIcons を標準採用し、ライトモードとダークモード（`.my-app-dark`）の双方で視認性とコントラストを確保しなければならない（MUST）。
- Chrome API 呼び出しや非同期処理は `async/await` 構文を基本とし、イベントリスナー等で意図的に待機しない Promise 呼び出しには `void` 演算子を明示しなければならない（MUST）。
- ユーザー向け表示テキストは `src/options/i18n.ts` および `package/_locales/{en,ja}/messages.json` で英語（`en`）・日本語（`ja`）の双方を定義し、コンポーネント内に表示文言をハードコードしてはならない（MUST NOT）。

**根拠**: コンパイル段階での欠陥検出を最大化し、設定画面とポップアップ画面の間で一貫した UX・デザイン・多言語対応を維持するため。

### V. 日本語ドキュメンテーションと仕様同期 (Japanese Documentation & Spec Sync)

コードベース全体の可読性と設計資産の一貫性を保つため、日本語によるドキュメンテーションと仕様書の同期を徹底しなければならない（MUST）。

- すべてのクラス、関数、メソッド（アロー関数を含む）には、概要説明・`@param`（引数がある場合）・`@returns`（戻り値がある場合）を記載した JSDoc コメントを**必ず日本語**で記述しなければならない（MUST）。
- インラインコメントおよびブロックコメントもすべて日本語で記述し、英語でのコメント記述を禁止する（MUST NOT）。ただし、サードパーティライセンス表記やツール固有のディレクティブ（`/// <reference ... />` 等）は例外とする。
- UI デザイン・配色・バッジ描画仕様を変更する場合は `DESIGN.md` を、機能仕様を新規策定・改修する場合は Spec Kit の仕様ドキュメント（`specs/` 配下）を、採用ライブラリやアーキテクチャ構成を変更する場合は本憲章および `AGENTS.md` を実装と同時に更新しなければならない（MUST）。

**根拠**: プロジェクトの言語規約を統一し、ソースコードと `DESIGN.md`・`AGENTS.md`・`specs/` 等の設計ドキュメント群との間にドキュメントドリフトが発生するのを防ぐため。

## 技術スタックおよびアーキテクチャ制約

本プロジェクトは以下の技術スタックとディレクトリ境界を標準構成として採用する。合理的な理由と憲章改定なしに新規フレームワークや重複ライブラリを導入してはならない（MUST NOT）。

- **ターゲット環境**: Chrome 拡張機能 Manifest V3（`package/manifest.json`）
- **プログラミング言語**: TypeScript 5.x（Target: `ES2020`、`moduleResolution: "bundler"`、`@types/chrome`）
- **UI フレームワーク・ライブラリ**:
  - Vue 3（`vue` 3.5+、SFC `<script setup lang="ts">`）
  - PrimeVue v4（`primevue`、`@primeuix/themes`、`@primevue/themes`、`primeicons`）
  - Intro.js（`intro.js`：初回オンボーディングツアー用）
- **ビルド・ツールチェーン**:
  - Webpack 5（`webpack`、`webpack-cli`、`ts-loader`、`vue-loader`、`css-loader`、`style-loader`、`rimraf`）
  - アイコン生成パイプライン: Node.js + `sharp`（`scripts/generate-icons.js` により `src/icon.svg` / `src/icon_dev.svg` から PNG アイコン群を生成）
- **ディレクトリ構造と生成物保護ルール**:
  - `src/`: すべての TypeScript ソース、Vue コンポーネント、スタイル、マスター SVG アイコンを配置する唯一の実装ディレクトリ。
  - `package/`: 配布用パッケージディレクトリ。`manifest.json`、`options.html`、`popup.html`、`_locales/` の静的定義ファイルのみを直接管理対象とする。
  - **生成物の直接編集禁止**: `package/js/` 配下のバンドル済みアセット、`package/icons/*.png`、およびルート直下の `package.zip` はビルド・生成スクリプトの出力物であり、直接編集してはならない（MUST NOT）。

## コーディング規約および開発ワークフロー

すべての機能追加・バグ修正・リファクタリングは以下の開発ワークフローおよび品質ゲートを通過しなければならない（MUST）。

- **必須ビルド検証ゲート**: コードや設定を変更した後は、作業完了前に必ず `npm run build` を実行し、TypeScript の厳格型チェック、Webpack 本番バンドル、および `package.zip` の生成がエラーなく完了することを確認しなければならない（MUST）。マスター SVG を更新した場合は事前に `npm run generate-icons` を実行する。
- **動作確認・回帰検証**: 自動テストがカバーしていない UI 操作およびブラウザ API 連携については、Chrome の拡張機能デベロッパーモードで `package/` を読み込み、該当コンテキスト（Background / Content / Options / Popup）、テーマ（ライト / ダーク）、言語（英語 / 日本語）、および一時OFFからの復元動作を検証しなければならない（MUST）。
- **コミットおよびリリース管理**:
  - コミットメッセージは Conventional Commits 形式（`feat:`, `fix:`, `chore:`, `style:`, `docs:`, `refactor:` 等）に従う。
  - バージョン更新（リリース）を行う際は、`package.json` と `package/manifest.json` の `version` フィールドを必ず同一のバージョン番号に同期させなければならない（MUST）。

## Governance

本 Constitution（憲章）は EnvIcon プロジェクトにおける開発原則・技術選定・コーディング規約の最上位規範であり、他の慣習や個別ドキュメントに優先する。`AGENTS.md`、`DESIGN.md`、`README.md`、および `specs/` 配下の個別仕様書等の記載と本憲章の間に不整合が生じた場合は本憲章を正とし、関連ドキュメント側を速やかに更新しなければならない（MUST）。

- **改定手続き (Amendment Procedure)**:
  - 原則の追加・変更・廃止を行う場合は、改定理由と既存コードへの影響範囲を明確にした上で `.specify/memory/constitution.md` を更新する（`/speckit-constitution` ワークフローの使用を推奨）。
  - 破壊的な原則変更を行う場合は、既存コードベースや関連ドキュメント（`AGENTS.md`、`DESIGN.md` 等）を新原則へ適合させる移行計画を併せて策定しなければならない（MUST）。
- **バージョニング方針 (Versioning Policy)**:
  - 本憲章のバージョンはセマンティックバージョニング（`MAJOR.MINOR.PATCH`）に従って管理する。
  - `MAJOR`: 既存原則の削除、または後方互換性のないガバナンス・アーキテクチャ原則の再定義。
  - `MINOR`: 新しい原則・セクションの追加、または既存規約の実質的な要件拡張。
  - `PATCH`: 意味的変更を伴わない文言の明確化、誤字脱字の修正、フォーマット調整。
- **コンプライアンス検証 (Compliance Review)**:
  - すべての仕様策定（`/speckit-specify`、`/speckit-plan`）、タスク分解（`/speckit-tasks`）、整合性検証（`/speckit-analyze`）、および実装・レビューにおいては、本憲章の5原則およびビルド検証ゲートへの準拠を確認しなければならない（MUST）。
  - やむを得ず原則からの逸脱や追加的な複雑性を導入する場合は、実装計画書（`plan.md`）の Complexity Tracking セクションにてその必要性と代替案却下理由を明文化しなければならない（MUST）。

**Version**: 1.0.0 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-07
