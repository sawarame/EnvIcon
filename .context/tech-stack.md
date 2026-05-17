# 技術スタック (Tech Stack)

## 言語・コア
- **言語**: TypeScript (v5.x)
- **マニフェストバージョン**: Chrome 拡張機能 Manifest V3

## フロントエンド フレームワーク
- **フレームワーク**: Vue 3 (Composition API, `<script setup>`)
- **UI コンポーネント ライブラリ**: PrimeVue (v4.x)
- **テーマ設定**: @primeuix/themes, @primevue/themes
- **アイコン**: PrimeIcons
- **オンボーディング**: Intro.js

## ビルドツール
- **バンドラー**: Webpack (v5.x)
- **ローダー**:
  - `ts-loader`: TypeScript 用
  - `vue-loader`: Vue コンポーネント用
  - `css-loader`, `style-loader`: スタイルシート用
- **クリーンアップ**: rimraf

## プロジェクト ユーティリティ
- **アイコン生成**: `node scripts/generate-icons.js` (`sharp` を使用)

## 権限 (Permissions)
- `storage`: 環境設定や言語設定の保存に使用。
- `<all_urls>`: コンテンツスクリプトの注入および、あらゆるウェブサイトでの favicon 変更に使用。
