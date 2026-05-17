---
name: store-description-generator
description: Chrome Web Store や他のストア向けの紹介文（STORE_DESCRIPTION.md）を、プロジェクトの仕様書（.context/spec.md）や技術スタック（.context/tech-stack.md）を元に自動生成または更新します。Markdown を使わず、プレーンテキスト形式で出力します。
---

# Store Description Generator

## Overview
このスキルは、開発中の拡張機能やアプリケーションの最新の仕様を反映した魅力的なストア説明文を作成することを目的としています。
Chrome ウェブストアは Markdown 形式に対応していないため、改行、記号、絵文字を活用したプレーンテキスト形式で `STORE_DESCRIPTION.md` を作成・更新します。

## Workflow

### 1. 情報の収集
まず、プロジェクトの最新の状況を把握するために以下のファイルを読み込みます。
- `.context/spec.md`: 機能の詳細と最新の更新内容
- `.context/tech-stack.md`: 使用されている技術
- `package.json`: バージョン情報や基本説明

### 2. テンプレートの適用
`references/template.md` にある構成案（プレーンテキスト形式）に従って、説明文の骨子を作成します。

### 3. 多言語対応の検討
必要に応じて、日本語と英語の両方の説明文を作成します。現在のプロジェクトに `_locales` フォルダがある場合は、そこに含まれるメッセージとも整合性を取ります。

### 4. STORE_DESCRIPTION.md の更新
生成した内容を `STORE_DESCRIPTION.md` に書き込み、ユーザーに確認を求めます。

## Guidelines
- **非 Markdown 形式**: `##` や `**` などの Markdown 記号は絶対に使用しないでください。
- **視認性の確保**: 見出しには `【 】` などの記望を使い、箇条書きには絵文字（🚀, 🌟, ● など）を活用してください。
- **ユーザー視点**: 技術的な詳細よりも、その機能がユーザーにどのようなメリットをもたらすかに焦点を当てます。
- **簡潔さ**: ストアの制限文字数（特に要約文の132文字）を意識します。

## Resources
- [references/template.md](references/template.md): ストア説明文の標準的なテンプレート（プレーンテキスト版）
