# EnvIcon Project Rules

## Overview
EnvIconは、開発・ステージング・本番環境を識別しやすくするために、ブラウザのfaviconを動的にカスタマイズするChrome拡張機能（Manifest V3）です。
ユーザーが設定したホスト名に基づき、faviconにオーバーレイ（PROD/STG/DEV）を表示します。

## Tech Stack
- **Language**: TypeScript
- **Framework**: Chrome Extension Manifest V3
- **Build Tool**: Webpack, ts-loader
- **Permissions**: `storage`, `<all_urls>`

## Directory Structure
- `src/`: TypeScriptソースコード
  - `background.ts`: サービスワーカー（バックグラウンド処理）
  - `content.ts`: ページに注入されるスクリプト
  - `options.ts`: オプション設定画面のロジック
  - `features/`: 各機能のモジュール化されたロジック
- `EnvIcon/`: 拡張機能の配布パッケージ用ディレクトリ
  - `manifest.json`: 拡張機能の設定ファイル
  - `options.html`: 設定画面のHTML
  - `images/`: アイコンアセット
  - `js/`: WebpackによってビルドされたJavaScriptファイル（自動生成）

## Development Workflow
- **Build**: `npm run build` を実行することで、`src/` のコードがビルドされ、`EnvIcon/js/` に出力されます。
- **Testing**: 変更を加えた後は、必ず `npm run build` が正常に終了することを確認してください。

## Coding Standards
- TypeScriptの型定義を厳格に適用し、`any` の使用を避ける。
- 非同期処理（Chrome APIなど）は `async/await` を基本とする。
- `src/` 配下のファイルを編集し、`EnvIcon/js/` 配下のファイルは直接編集しない（ビルドで上書きされるため）。
- 新機能を追加する場合は、`src/features/` にロジックを分離することを検討する。

## Specifications
- **各種機能の要件や詳細データ構造**については、必ずプロジェクトルートにある `SPEC.md` を参照・更新すること。
- 機能追加や改修を行う際は、実装前に `SPEC.md` の該当機能部分の仕様を確認し、変更がある場合はドキュメントも更新する。
