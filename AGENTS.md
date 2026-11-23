# EnvIcon Agent Guidelines & Project Constitution

## 概要

EnvIcon は、開発・ステージング・本番などの各環境を視覚的に識別しやすくするために、ブラウザの Favicon・ページ内バッジ・ツールバーアイコン・DevTools コンソール出力を動的にカスタマイズする Chrome 拡張機能（Manifest V3）です。

本ドキュメントは、EnvIcon プロジェクトにおける開発原則・技術スタック・アーキテクチャ制約・コーディング規約の最上位規範を定義します。

---

## 参照ドキュメント（Single Source of Truth）

開発・設計・コード変更を行う際は、以下のドキュメントを基準としてください。記載間に不整合が生じた場合は本ドキュメントの開発原則を正とし、関連ドキュメントを速やかに同期更新してください。

- **開発原則・規約（本ドキュメント）**: [AGENTS.md](AGENTS.md)
- **機能仕様書（URL マッチング・バリデーション・UI 挙動・ツアー仕様）**: [SPEC.md](SPEC.md)
- **デザイン仕様書（UI テーマ・カラー・バッジ描画仕様・画面レイアウト）**: [DESIGN.md](DESIGN.md)

---

## コア開発原則（Core Principles）

### I. コンテキスト分離と機能モジュール化

拡張機能の各実行コンテキスト（`src/background.ts`、`src/content.ts`、`src/options.ts`、`src/popup.ts`）は責務を明確に分離しなければなりません（MUST）。

- `src/content.ts` はストレージの初期読み込み・URL遷移監視・変更イベントの購読のみを担う薄いオーケストレーターとして保ち、個別のドメイン機能ロジックを直接記述してはなりません（MUST NOT）。
- Web ページ上で動作する各機能（Favicon 書き換え、ページ内バッジ表示、コンソールログ出力、URL 監視、ホスト名・URL マッチング等）は `src/features/` 配下に独立したモジュールとして実装し、初期化関数（`initialize*`）および再評価関数（`refresh*`）等を公開します（MUST）。
- コンテキスト間で共有するデータ構造・ストレージ型・メッセージング契約はすべて `src/types.ts` に一元定義します（MUST）。
- CORS 制約を受ける外部リソース取得やブラウザタブ情報の参照は、コンテンツスクリプト内で無理に処理せず、`chrome.runtime.onMessage` を介して `src/background.ts`（Service Worker）へ委譲します（MUST）。

### II. 3層ストレージ管理とリアルタイム同期

状態データは用途とライフサイクルに応じて Chrome Storage の3領域を厳密に使い分けます（MUST）。

- `chrome.storage.sync`: 環境設定リスト（`environments: EnvironmentConfig[]`）の永続化およびブラウザ間同期にのみ使用します。デフォルト環境（`prod`、`stg`、`dev`）は `isDeletable: false` として削除から保護します（MUST）。
- `chrome.storage.local`: 表示言語（`language`）、テーマ設定（`darkMode`）、オンボーディング完了状態（`tutorialCompleted`）など、端末・ブラウザ固有の UI 設定の保存に使用します。
- `chrome.storage.session`: 全体一時OFF（`globalDisabled`）およびサイト単位の一時OFF（`disabledHostnames`）の保存に使用します。`TRUSTED_AND_UNTRUSTED_CONTEXTS` アクセスレベルを設定し、ブラウザ再起動時に自動クリア（ON状態へ自動復帰）される設計を維持します（MUST）。
- ストレージの更新は `chrome.storage.onChanged` を通じて監視し、ページリロードを伴わずに Favicon・ページ内バッジ・ツールバーアイコンへ即座に反映させます（MUST）。
- UI からの連続的な `chrome.storage.sync` 書き込みにはデバウンス処理（標準 500ms）と事前バリデーションを適用し、不正データの保存および書き込みクォータ超過を防止します（MUST）。

### III. 非破壊的なページ介入と復元保証

`<all_urls>` で任意の Web サイトに注入されるスクリプトとして、ホストページの DOM 構造・スタイル・ユーザー操作を決して阻害してはなりません（MUST NOT）。

- ページ内に挿入するバッジ等のオーバーレイ要素には `pointer-events: none` および `user-select: none` を必ず適用し、ホストページのクリックやテキスト選択を妨げてはなりません（MUST NOT）。
- サイト本来の `<link rel="icon">` 要素を無効化・置換する際は元の属性（`data-original-rel` 等）を保持し、一時OFFへの切り替えや環境登録解除・対象外パス遷移時にはページリロードなしで元の Favicon と DOM 状態を完全に復元します（MUST）。
- SPA 遷移やサイト側の動的な Favicon 変更を `MutationObserver` 等で監視する際は、リクエスト ID による非同期世代管理と前回適用結果の差分比較を行い、競合状態（Race Condition）や無限再描画ループを防止します（MUST）。

### IV. 厳格な型安全性と Vue 3 モダン規約

すべてのフロントエンドおよびバックグラウンド実装は、厳格な TypeScript 型検査と統一された Vue 3 コンポーネント設計に従います（MUST）。

- `tsconfig.json` の `strict: true` を維持し、プロダクションコードにおける `any` 型の使用を禁止します（MUST NOT）。外部入力（JSON インポート等）や例外ハンドリングでは `unknown` 型と型ガードを使用します（MUST）。
- Options 画面および Popup 画面のすべての Vue コンポーネントは Vue 3 Composition API（`<script setup lang="ts">`）で記述し（MUST）、Options API を新規に使用してはなりません（MUST NOT）。
- UI コンポーネントは PrimeVue v4（`@primeuix/themes` の Aura プリセット）と PrimeIcons を標準採用し、ライトモードとダークモード（`.my-app-dark`）の双方で視認性とコントラストを確保します（MUST）。
- Chrome API 呼び出しや非同期処理は `async/await` 構文を基本とし、イベントリスナー等で意図的に待機しない Promise 呼び出しには `void` 演算子を明示します（MUST）。
- ユーザー向け表示テキストは `src/options/i18n.ts` および `package/_locales/{en,ja,zh_CN,zh_TW,ko}/messages.json` で英語（`en`）・日本語（`ja`）・中国語［簡体字（`zh-CN` / `zh_CN`）・繁体字（`zh-TW` / `zh_TW`）］・韓国語（`ko`）の全5言語を定義し、コンポーネント内に表示文言をハードコードしてはなりません（MUST NOT）。

### V. 日本語ドキュメンテーションと仕様同期

コードベース全体の可読性と設計資産の一貫性を保つため、日本語によるドキュメンテーションと仕様書の同期を徹底します（MUST）。

- すべてのクラス、関数、メソッド（アロー関数を含む）には、概要説明・`@param`（引数がある場合）・`@returns`（戻り値がある場合）を記載した JSDoc コメントを**必ず日本語**で記述します（MUST）。
- インラインコメントおよびブロックコメントもすべて日本語で記述し、英語でのコメント記述を禁止します（MUST NOT）。ただし、サードパーティライセンス表記やツール固有のディレクティブ（`/// <reference ... />` 等）は例外とします。
- UI デザイン・配色・バッジ描画仕様を変更する場合は [DESIGN.md](DESIGN.md) を、機能仕様を新規策定・改修する場合は [SPEC.md](SPEC.md) を、採用ライブラリやアーキテクチャ構成を変更する場合は本ドキュメント（[AGENTS.md](AGENTS.md)）を実装と同時に更新します（MUST）。

---

## 技術スタックおよびアーキテクチャ制約

合理的な理由なしに新規フレームワークや重複ライブラリを導入してはなりません（MUST NOT）。

- **ターゲット環境**: Chrome 拡張機能 Manifest V3（`package/manifest.json`）
- **プログラミング言語**: TypeScript 5.x（Target: `ES2020`、`moduleResolution: "bundler"`、`@types/chrome`）
- **UI フレームワーク・ライブラリ**:
  - Vue 3（`vue` 3.5+、SFC `<script setup lang="ts">`）
  - PrimeVue v4（`primevue`、`@primeuix/themes`、`primeicons`）
  - Intro.js（`intro.js`：初回オンボーディングツアー用）
- **ビルド・ツールチェーン**:
  - Webpack 5（`webpack`、`webpack-cli`、`ts-loader`、`vue-loader`、`css-loader`、`style-loader`、`rimraf`）
  - アイコン生成パイプライン: Node.js + `sharp`（`scripts/generate-icons.js` により `src/icon.svg` / `src/icon_dev.svg` から PNG アイコン群を生成）

---

## ディレクトリ構造と生成物保護ルール

- `src/`: すべての TypeScript ソースコード、Vue コンポーネント、スタイル、マスター SVG を配置する唯一の実装ディレクトリ
  - `background.ts`: サービスワーカー（ツールバーアイコンの動的描画、ストレージアクセス権限設定、画像取得プロキシ、URL変更通知等）
  - `content.ts`: Web ページ注入スクリプト（初期データ読み込み・画面内 URL 遷移監視・ストレージ変更監視のオーケストレーター）
  - `options.ts`: オプション設定画面の Vue マウント用エントリーポイント
  - `popup.ts`: クイック操作ポップアップ画面の Vue マウント用エントリーポイント
  - `types.ts`: コンテキスト間で共有するインターフェース・型定義
  - `env.d.ts`: Vue SFC などのモジュール型定義
  - `features/`: ページ上および共通で利用する各機能モジュール（`canvas_utils.ts`, `console_logger.ts`, `defaults.ts`, `favicon_changer.ts`, `matcher.ts`, `page_badge_changer.ts`, `session.ts`, `url_observer.ts`, `url_parser.ts`, `utils.ts`）
  - `options/`: オプション画面の Vue コンポーネント（`App.vue`, `components/`）、Composable（`composables/`）、多言語辞書（`i18n.ts`）、バリデーション・補助関数（`utils.ts`）、スタイル（`App.css`）
  - `popup/`: ポップアップ画面の Vue コンポーネント（`PopupApp.vue`）およびスタイル（`PopupApp.css`）
- `package/`: 拡張機能の配布パッケージ用ディレクトリ（`manifest.json`、`options.html`、`popup.html`、`_locales/` の静的定義ファイルのみ直接管理対象）
  - `manifest.json`: Chrome 拡張機能マニフェスト（Manifest V3）
  - `options.html` / `popup.html`: 各画面のエントリー HTML
  - `_locales/`: 拡張機能メタデータの多言語リソース（`en`, `ja`, `zh_CN`, `zh_TW`, `ko`）
  - `icons/`: 生成された PNG アイコンアセット（自動生成）
  - `js/`: Webpack によってビルドされた JavaScript バンドル（自動生成）
- `scripts/`: ビルド補助スクリプト（`generate-icons.js`）
- **生成物の直接編集禁止**: `package/js/` 配下のバンドル済みアセット、`package/icons/*.png`、およびルート直下の `package.zip` はビルド・生成スクリプトの出力物であり、直接編集してはなりません（MUST NOT）。

---

## 開発ワークフローおよび品質ゲート

- **ビルド検証（必須）**: コードや設定を変更した後は、作業完了前に必ず `npm run build` を実行し、TypeScript の厳格型チェック、Webpack 本番バンドル、および `package.zip` の生成がエラーなく完了することを確認します（MUST）。
- **アイコン生成**: `src/icon.svg` または `src/icon_dev.svg` を変更した場合は、`npm run generate-icons`（開発用は `npm run generate-icons:dev`）を実行して `package/icons/` を更新します。
- **動作確認・回帰検証**: UI 操作およびブラウザ API 連携については、Chrome の拡張機能デベロッパーモードで `package/` を読み込み、該当コンテキスト（Background / Content / Options / Popup）、テーマ（ライト / ダーク）、言語（英語 / 日本語 / 中国語［簡体字・繁体字］ / 韓国語、およびブラウザ言語自動判定）、および一時OFFからの復元動作を確認します（MUST）。
- **コミットおよびリリース管理**:
  - コミットメッセージは Conventional Commits 形式（`feat:`, `fix:`, `chore:`, `style:`, `docs:`, `refactor:` 等）に従います。
  - バージョン更新（リリース）を行う際は、`package.json` と `package/manifest.json` の `version` フィールドを必ず同一のバージョン番号に同期させます（MUST）。
