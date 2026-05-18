# EnvIcon Project Rules

## Overview
EnvIconは、開発・ステージング・本番環境を識別しやすくするために、ブラウザのfaviconを動的にカスタマイズする Chrome 拡張機能です。
基本ルールやディレクトリ構造についてはこのファイルを参照し、具体的な技術スタックや詳細な仕様については `.context/` 配下のドキュメントを参照してください。

## Context & Specifications
プロジェクトの詳細な情報は以下のファイルにまとめられています。
- **技術スタック**: [.context/tech-stack.md](.context/tech-stack.md)
- **詳細仕様書**: [.context/spec.md](.context/spec.md)

## Directory Structure
- `src/`: TypeScriptソースコード
  - `background.ts`: サービスワーカー（バックグラウンド処理）
  - `content.ts`: ページに注入されるスクリプト
  - `options.ts`: オプション設定画面のVueマウント用エントリーポイント
  - `env.d.ts`: Vueコンポーネントなどの型定義ファイル
  - `features/`: 各機能のモジュール化されたロジック
  - `options/`: オプション画面のVueコンポーネントおよびユーティリティ
- `EnvIcon/`: 拡張機能の配布パッケージ用ディレクトリ
  - `manifest.json`: 拡張機能の設定ファイル
  - `options.html`: 設定画面のHTML
  - `images/`: アイコンアセット
  - `js/`: WebpackによってビルドされたJavaScriptファイル（自動生成）
- `.context/`: プロジェクトのメタ情報と仕様書
  - `tech-stack.md`: 使用されている技術、ライブラリ、ツール
  - `spec.md`: 各機能の詳細仕様

## Development Workflow
- **Build**: `npm run build` を実行することで、`src/` のコードがビルドされ、`EnvIcon/js/` に出力されます。
- **Testing**: 変更を加えた後は、必ず `npm run build` が正常に終了することを確認してください。

## Coding Standards
- TypeScriptの型定義を厳格に適用し、`any` の使用を避ける。
- Vue 3 の Composition API (`<script setup>`) を推奨。
- 非同期処理（Chrome APIなど）は `async/await` を基本とする。
- `src/` 配下のファイルを編集し、`EnvIcon/js/` 配下のファイルは直接編集しない（ビルドで上書きされるため）。
- 新機能を追加する場合は、`src/features/` にロジックを分離することを検討する。
