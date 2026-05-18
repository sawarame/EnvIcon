# Store Description (Chrome Web Store)

This file contains the descriptions for the Chrome Web Store in plain text format (non-Markdown) for easy copy-pasting.

## Japanese (日本語)

【要約】（最大132文字）
本番・検証・開発環境を Favicon やページ内バッジで瞬時に識別！誤操作を防ぐエンジニア必携のブラウザ拡張機能。

【概要】
EnvIcon は、複数の環境（PROD/STG/DEVなど）を同時に開いて作業する開発者のためのツールです。
「本番環境だと思ったら検証環境だった」「間違えて本番データを操作してしまった」といったミスを、視覚的なインジケーターで未然に防ぎます。
設定したホスト名や正規表現パターンに基づき、Favicon へのバッジ重畳、ページ内へのフローティングバッジ表示、コンソールログ出力などを動的に行います。

【主な機能】
🚀 Favicon バッジの動的書き換え
現在開いているページの Favicon に、環境名を示すバッジ（PROD, STG など）を重ねて表示します。タブが多数並んでいても、どの環境のページか一目で判別可能です。

🌟 ページ内フローティングバッジ
ページの四隅（カスタマイズ可能）に、半透明の環境バッジを固定表示します。Favicon だけでなく、作業中の画面上でも常に環境を意識できます。

💻 デベロッパーツール（コンソール）連携
ブラウザのコンソールログに現在の環境名をカラー出力します。開発中にデベロッパーツールを開いた際、即座に接続先環境を確認できます。

🛠️ 自由度の高いカスタマイズ
バッジのテキスト（最大4文字）、文字色、フチドリ色、フォントサイズ、表示位置などを環境ごとに細かく設定できます。

🔍 正規表現による高度なマッチング
単純なドメイン一致だけでなく、正規表現を用いた柔軟なホスト名判定が可能です。複雑な URL 構造を持つプロジェクトにも対応します。

🌓 ダークモード & 多言語対応
モダンな UI で、ダークモードを完備。英語と日本語をシームレスに切り替えて利用できます。

📦 設定のインポート/エクスポート
作成した環境設定を JSON 形式で書き出し・読み込みできます。チームメンバー間での設定共有も簡単です。

【使い方】
1️⃣ 拡張機能のオプション画面を開きます。
2️⃣ 「環境追加」から、識別したい環境（例：Local, Staging）を作成します。
3️⃣ 対象となるホスト名（例：localhost, stg.example.com）を登録し、バッジの色を自分好みにカスタマイズして保存すれば完了です！

【プライバシーとセキュリティ】
すべての設定データはブラウザの同期ストレージ（chrome.storage.sync）に保存されます。入力されたホスト名や設定情報が外部のサーバーに送信されることは一切ありません。

---

## English

[Summary] (Max 132 chars)
Instantly identify Prod, Staging, and Dev environments with favicon badges! A must-have tool for developers to prevent misoperations.

[Overview]
EnvIcon is a browser extension designed for developers who manage multiple environments simultaneously.
Prevent critical mistakes like "I thought this was Staging, but it was Production!" with clear visual indicators.
It dynamically applies badges to favicons, displays floating page badges, and outputs console logs based on your hostname or regex patterns.

[Key Features]
🚀 Dynamic Favicon Badging
Overlays environment labels (e.g., PROD, STG) on the current page's favicon. Easily identify environments even with many tabs open.

🌟 In-Page Floating Badges
Displays a semi-transparent environment badge at any corner of the page. Stay aware of your current environment while you work.

💻 DevTools (Console) Integration
Prints the current environment name in the browser console with colors. Instantly verify which environment you are connected to while debugging.

🛠️ Highly Customizable
Tailor badge text (up to 4 chars), text colors, outlines, font sizes, and positions for each environment.

🔍 Advanced Regex Matching
Supports flexible hostname matching using regular expressions. Perfect for projects with complex URL structures.

🌓 Dark Mode & Multi-language Support
Features a modern UI with full dark mode support. Seamlessly switch between English and Japanese.

📦 Export/Import Settings
Easily export and import your configurations as JSON files. Perfect for sharing environment settings within your team.

[How to Use]
1. Open the extension options page.
2. Click "Add Environment" to create a new environment (e.g., Local, Staging).
3. Register your hostnames (e.g., localhost, stg.example.com), customize the badge style, and save!

[Privacy & Security]
All configuration data is stored locally via chrome.storage.sync. No data is ever sent to external servers.
