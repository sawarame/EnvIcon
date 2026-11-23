# EnvIcon 機能仕様書 (Functional Specifications)

このドキュメントは、Chrome 拡張機能「EnvIcon」における機能要件、URL マッチング規則、バリデーションおよび UI 操作の振る舞いをまとめた仕様書です。

- **UI デザイン・配色・バッジ描画仕様**: [DESIGN.md](DESIGN.md)
- **開発原則・技術スタック・コーディング規約**: [AGENTS.md](AGENTS.md)
- **共有型定義（Single Source of Truth）**: `src/types.ts`

---

## 1. ストレージおよびコンテキスト間連携仕様

### 1.1 Chrome Storage の3層使い分けとリアルタイム同期

| ストレージ領域 | 主なキー | 用途・ライフサイクル | 書き込み元 | 購読・反応先 |
| :--- | :--- | :--- | :--- | :--- |
| `chrome.storage.sync` | `environments` | 環境設定リスト（`EnvironmentConfig[]`）の永続化・ブラウザ間同期。デフォルト環境（`prod` / `stg` / `dev`）は `isDeletable: false` として削除から保護する。 | Options UI（500ms デバウンス自動保存 / インポート）、Popup UI（ワンクリック登録・解除） | Content Script、Service Worker、Options UI、Popup UI |
| `chrome.storage.local` | `language`, `darkMode`, `tutorialCompleted` | 端末・ブラウザ固有の UI 設定（表示言語設定 `"auto" \| "en" \| "ja" \| "zh-CN" \| "zh-TW" \| "ko"`、テーマ、オンボーディング完了状態）の保存。 | Options UI | Options UI、Popup UI |
| `chrome.storage.session` | `globalDisabled`, `disabledHostnames` | 全体一時OFFおよびサイト単位（`ホスト名[:ポート番号]`）の一時OFF状態の保存。`TRUSTED_AND_UNTRUSTED_CONTEXTS` を設定し、ブラウザ再起動時に自動クリア（ON状態へ自動復帰）する。 | Popup UI（全体ON/OFF、サイト別一時OFF）、Options UI（全体一時OFF解除ボタン） | Content Script、Service Worker、Options UI、Popup UI |

すべてのストレージ変更は `chrome.storage.onChanged` で監視し、ページ再読み込みを伴わずに Favicon・ページ内バッジ・ツールバーアイコンへ即座に反映します。

### 1.2 コンテキスト間メッセージング契約

| 方向 | メッセージ種別 (`type`) | Payload / レスポンス | 用途 |
| :--- | :--- | :--- | :--- |
| Content Script → Service Worker | `GET_TAB_INFO` | Req: `{ type: "GET_TAB_INFO" }`<br>Res: `{ favIconUrl?: string; url?: string }` | DOM 内に `<link rel="icon">` が存在しないページで、ブラウザ検出済みの Favicon URL を補完する。 |
| Content Script → Service Worker | `FETCH_IMAGE` | Req: `{ type: "FETCH_IMAGE", url: string }`<br>Res: `{ dataUrl?: string; error?: string }` | CORS 制限を回避して元サイトの Favicon 画像を Data URL として取得する。 |
| Service Worker → Content Script | `URL_CHANGED` | Payload: `{ type: "URL_CHANGED", url: string }`（単方向通知） | `chrome.tabs.onUpdated` で `changeInfo.url` の変化を検知した際に通知し、SPA の画面内遷移へ即座に追従する（未注入・破棄済みタブでの送信エラーは安全に無視する）。 |

### 1.3 表示言語の自動判定と多言語切り替え仕様
- **対応言語（5言語）**: 英語（`en`）・日本語（`ja`）・中国語［簡体字（`zh-CN`）・繁体字（`zh-TW`）］・韓国語（`ko`）に対応する。Chrome 拡張機能メタデータは `package/_locales/{en,ja,zh_CN,zh_TW,ko}/messages.json` で定義し、`manifest.json` の `default_locale` は `en` を維持する。
- **デフォルト動作と自動判定ルール**: `chrome.storage.local` の `language` が未設定・`"auto"`・不正値の場合は、`chrome.i18n?.getUILanguage?.() || navigator.language || "en"` を小文字化および `_` → `-` 正規化した値から以下で解決する。
  - `ja` / `ja-*` → `ja`
  - `ko` / `ko-*` → `ko`
  - `zh-tw` / `zh-hk` / `zh-mo` / `zh-hant`（または `zh-*` で `-hant` を含むタグ） → `zh-TW`
  - 上記以外の `zh` / `zh-*` → `zh-CN`
  - 上記以外のすべての言語 → `en`（フォールバック）
- **手動選択・即時同期・HTML 言語属性**: Options UI ヘッダーの「言語切り替え」サブメニューには先頭に「ブラウザの言語（自動）」、続けて5言語（`English` / `日本語` / `简体中文` / `繁體中文` / `한국어`）を配置する。選択値は `chrome.storage.local.language` に保存し、`chrome.storage.onChanged` により Options UI と Popup UI 間で即時同期する。適用時には `document.documentElement.lang` を解決済み言語コードへ更新し、各言語（特に CJK）の適切なフォント描画を保証する。

---

## 2. ポート番号・URLパス対応の環境マッチング仕様

### 2.1 対応スキームと対象外要素
- 動作対象スキームは通常の Web ページ（`http:` および `https:`）のみとし、ブラウザ内部設定ページや拡張機能ストア等の制限ページは対象外とします。
- クエリパラメータ（`?...`）およびハッシュフラグメント（`#...`）は環境判定の対象外とし、入力の正規化時・判定時の双方で除外します。

### 2.2 通常パターンの受け入れ構文と正規化ルール
オプション設定画面のパターン入力欄および設定 JSON インポートでは、通常モード（`isRegex: false`）において以下の構文を受け付け、含まれる要素から判定範囲を自動判別します。

```text
[ "http://" | "https://" ] <hostname> [ ":" <port> ] [ "/" <path> ] [ "?" <query> ] [ "#" <hash> ]
```

- **ホスト名**: 小文字へ正規化し、大文字・小文字を区別せずに判定します。IPv6 アドレス（例: `[::1]:8080`）にも対応します。
- **ポート番号**: 1〜65535 の整数を許容します。HTTP 標準ポート（`80`）および HTTPS 標準ポート（`443`）は標準ポート省略時の表現と整合するよう正規化します。
- **パス**: 先頭 `/` を含み、末尾 `/` を除去して保存します。パスが `/` のみの場合は「パス指定なし」として扱います。パスの大文字・小文字は維持し、判定時も区別（ケースセンシティブ）します。

| ユーザー入力例 | 有効/無効 | 正規化後の保存値 (`value`) | 判定スコープ |
| :--- | :---: | :--- | :--- |
| `Example.COM` | 有効 | `example.com` | 全ポート・全パス一致 |
| `https://example.com/` | 有効 | `example.com` | 全ポート・全パス一致（トップ `/` 除去） |
| `http://example.com:80/app/` | 有効 | `example.com/app` | 標準ポート省略化＋末尾 `/` 除去 |
| `https://example.com:443/app` | 有効 | `example.com/app` | 標準ポート省略化 |
| `localhost:3000` | 有効 | `localhost:3000` | ポート `3000` の全パス一致 |
| `localhost:3000/` | 有効 | `localhost:3000` | ポート `3000` の全パス一致 |
| `example.com/stg` | 有効 | `example.com/stg` | 全ポートの `/stg` または `/stg/...` 一致 |
| `example.com/Admin?tab=1#top` | 有効 | `example.com/Admin` | クエリ・ハッシュ除去、パスの大文字維持 |
| `[::1]:8080/api/v1/` | 有効 | `[::1]:8080/api/v1` | IPv6＋ポート `8080`＋パス配下一致 |
| `ftp://example.com` | **無効** | （保存保留・エラー） | 未対応スキーム |
| `example.com:0` / `example.com:70000` | **無効** | （保存保留・エラー） | ポート範囲外（1〜65535 以外） |
| `example.com:abc` / `example.com:` | **無効** | （保存保留・エラー） | 非数値ポート |
| `..example.com` / `-bad.com` | **無効** | （保存保留・エラー） | 不正ホスト名構文 |

### 2.3 一致判定ルール

#### 通常パターン（`isRegex: false`）
評価対象のロケーション情報（`TargetLocation`）に対し、以下の **3条件すべて** を満たす場合に一致とします。
1. **ホスト名一致**: `pattern.hostname === target.hostname`（双方小文字）
2. **ポート一致**: `pattern.port === ""`（ポート未指定なら全ポート一致）、または `pattern.port === target.port`（明示標準ポート指定時は `pattern.port === target.effectivePort`）
3. **パス一致**: `pattern.path === ""`（パス未指定なら全パス一致）、または以下のいずれかを満たす（スラッシュ区切りのセグメント境界一致・大文字小文字区別あり）：
   - `target.normalizedPath === pattern.path`
   - `target.normalizedPath.startsWith(pattern.path + "/")`
   - ※ 単なる前方一致となる別名パス（例: `/stg` に対する `/staging`）には一致しません。

#### 正規表現パターン（`isRegex: true`）
`regex = new RegExp(pattern.value.trim())` としたとき、以下のいずれかを満たす場合に一致とします。
1. `regex.test(target.hostAndPath)` が `true`（ルート `/` の場合は `target.hostWithPort` 単体へのテストも含む）。
2. **後方互換判定**: パターン文字列に `:` と `/` のいずれも含まれない場合において、`regex.test(target.hostname)` が `true`（既存のホスト名向け正規表現 `^.*\.local$` 等を無修正で維持）。

### 2.4 詳細度に基づく優先順位ルール
現在の URL が複数の有効なパターンに同時に一致した場合、以下の優先順位（`MatchSpecificity`）により適用する単一の環境とパターンを確定的に決定します。

1. **大分類レベル (`tier`)**:
   - `3`: パス指定あり ＞ `2`: ポート指定あり（パスなし） ＞ `1`: ホスト名のみ
2. **同一階層内のルール種別 (`isExactRule`)**:
   - 通常パターン（`1`） ＞ 正規表現パターン（`0`）
3. **パスの具体性（パス指定あり同士の比較）**:
   - パスのセグメント数（`pathSegmentCount`）が多い（深い階層）ほど優先
   - セグメント数が同じ場合は、パスの文字数（`pathLength`）が長いほど優先
   - パス長も同じ場合は、ポート指定あり（`hasPort: 1`） ＞ ポート指定なし（`hasPort: 0`）
4. **定義順（タイブレーカー）**:
   - 環境リストの上から順（`envIndex` が小さい順）
   - 同一環境内のパターンリストの上から順（`patternIndex` が小さい順）

### 2.5 画面内遷移（SPA）へのリアルタイム追従とコンソール出力抑止
- `src/features/url_observer.ts` において、Service Worker からの `URL_CHANGED` メッセージおよび `window` の `popstate` イベントを監視します。
- 現在の `window.location.href` から `hostWithPort + pathname` を算出し、直前に評価したキーと異なる場合のみ再評価を実行します（クエリやハッシュのみの変更では再描画しません）。
- パス遷移によって対象外となった場合は、リロードなしでサイト本来の Favicon と DOM 状態を完全に復元します。
- DevTools コンソールへの環境情報出力（`src/features/console_logger.ts`）は、初期読み込み時および判定結果の環境 ID が前回から変化したときのみ実行し、同一環境内でのパス遷移では重複出力しません。

### 2.6 クイック操作ポップアップの操作単位と誤編集防止ロック
- **表示・操作単位**: アクティブタブの `target.hostWithPort`（標準ポート時は `example.com`、非標準ポート時は `localhost:3000` 等）を操作単位とします。
- **ワンクリック登録・解除**: 環境ボタンをクリックすると、選択した環境の `hostnames` 末尾に `{ value: target.hostWithPort, isRegex: false, enabled: true }` を追加し、他環境に同一の通常パターンがあれば除去します。
- **誤編集防止ロック条件**: `matchDetail !== null && !matchDetail.isExactHostPortMatch` の場合（パス指定パターン、正規表現パターン、または非標準ポート閲覧時のポートなし親ホストパターンで一致している場合）は、共有ルールの誤破壊を防ぐためワンクリック変更・解除ボタンを非表示とし、一致中の環境・パターン文字列と設定画面を開くボタンを案内します。
- **サイト単位の一時OFF**: ロック状態の有無にかかわらず常に操作可能とし、`SessionData.disabledHostnames` に `target.hostWithPort` 単位で追加・削除します。

### 2.7 オプション設定画面 URL チェッカーの挙動
- 入力された検証用 URL に対し、実運用と完全に同一の正規化・一致判定・優先順位ルールを適用します。
- 複数パターンに一致する場合でも、最終的に採用された単一の環境バッジを表示し、該当環境のタブを自動的に「URLパターン (`urls`)」へ切り替えたうえで、採用された **1行のみ** に `.match-success` ハイライトを適用します。

---

## 3. 自動保存バリデーションおよび不備理由ホバー表示仕様

### 3.1 全7種類の保存検証ルールと評価順序
オプション設定画面での自動保存（500ms デバウンス）前に、`src/options/utils.ts` の純粋関数 `validateEnvironments()` が環境配列の先頭から末尾へ順番に検証を行い、正規化データ・各入力欄の赤枠エラー状態（`fieldErrorsByEnv`）・構造化不備リスト（`errorItems`）を同時に算出します。

各環境内では以下の順序で評価します。

1. **環境名の未入力 (`empty_name`)**: `env.name.trim() === ""` の場合。
2. **バッジ文字色の形式不正 (`invalid_badge_color`)**: 空でなく HEX 形式（`#RGB` / `#RGBA` / `#RRGGBB` / `#RRGGBBAA`）に一致しない場合。
3. **バッジフチ色の形式不正 (`invalid_badge_outline_color`)**: 空でなく上記 HEX 形式に一致しない場合。
4. **ページ内バッジ文字サイズの範囲外 (`invalid_font_size`)**: `env.pageBadgeEnabled !== false` のときのみ評価。数値でない、`NaN`、または `1` 未満・`500` 超の場合（ページ内バッジが OFF の場合は検証対象外）。
5. **URLパターン・正規表現パターンの検証**（`hostnames` 配列の先頭から走査、空白のみの行はスキップ）：
   - **正規表現構文エラー (`invalid_regex_pattern`)**: `isRegex === true` で `new RegExp(rawValue)` が例外を送出した場合。
   - **通常URLパターン形式不正 (`invalid_url_pattern`)**: `isRegex === false` で `normalizeUrlPattern(rawValue)` が `null` を返した場合。
   - **パターン重複 (`duplicate_pattern`)**: 構文・形式が有効な行について、正規化済み判定キー（通常: `pattern:<normalized>`、正規表現: `regex:<rawValue>`）が先行行と重複した場合。後発の重複行をエラー対象（赤枠強調と完全一致）とし、同一環境内重複（`isSameEnvDuplicate: true`）か異環境間重複（重複元の環境ID・環境名を保持）かを区別して記録します。

- **一貫性保証**: 画面上の赤枠エラー表示（`fieldErrorsByEnv`）とホバー表示される不備理由リスト（`errorItems`）は同一関数から算出され、常に 100% 一致します。
- **カスタム環境名が空欄の場合の扱い**: 不備理由のグループ見出しや重複相手名に空文字を出さず、各対応言語に応じた代替ラベル（例: 日本語 `（名称未設定の環境）` / 英語 `(Unnamed Environment)` / 簡体字 `（未命名环境）` / 繁体字 `（未命名環境）` / 韓国語 `(이름 없는 환경)`）を使用します。
- **状態復帰**: 入力修正・パターン行削除・環境削除・「編集内容を取り消す」操作により全不備が解消された場合、直前の保存済み状態と同一に戻ったケースを含め保存エラー表示を確実に解除します。

### 3.2 不備理由ポップオーバーの表示・操作仕様
`src/options/components/SaveStatusIndicator.vue`（ツアー互換のため `#save-status` ID を維持）にて提供します。

- **表示条件**: `saveStatus === 'error'`（入力不備による未保存エラー状態）のときのみ表示可能とし、「保存中」や「自動保存完了」時はホバーしても表示しません。
- **視覚的手がかりとアクセシビリティ**: エラー状態時はアンバー警告配色のピルに補助情報アイコン（`pi pi-info-circle`）と `cursor: help` を付与し、`tabindex="0"`・`aria-expanded`・`aria-controls` によるキーボードフォーカス表示および `Escape` キーでの閉じる操作に対応します。
- **配置・スクロール・ホバー維持**:
  - 固定フッター上で画面外へ見切れないよう、ステータスピルの直上（`bottom: calc(100% + 10px)`、右端揃え）に展開します。
  - ステータスピルと吹き出しの間の透明ブリッジと `120ms` のクローズ猶予により、吹き出し上へカーソルを移動しても表示を維持し、双方からカーソルが離れた時点で閉じます。
  - 幅 `min(440px, calc(100vw - 3rem))`（最小幅 `280px`）、本文最大高さ `min(300px, calc(100vh - 140px))`＋縦スクロール（`overflow-y: auto`）により、10件以上の不備があっても全件閲覧できます。
  - 80文字を超える長文パターンは先頭 80文字＋`...` に省略し、CSS の `overflow-wrap: anywhere` と併用して横幅崩れを防ぎます。
- **多言語・テーマ連動**: 不備理由は言語非依存の `ValidationErrorItem` として保持し、現在の選択言語（`en` / `ja` / `zh-CN` / `zh-TW` / `ko`）へ動的翻訳して表示します。ライトモード・ダークモードの配色トークンに追従します。

---

## 4. オプション設定画面の UI 構成・操作仕様

オプション設定画面の各環境カード（`src/options/components/EnvSection.vue`）は、既存データ構造（`EnvironmentConfig`）の互換性を保ちつつ、一覧性と入力快適性を両立するタブ切り替え構造を採用しています。

### 4.1 環境カードヘッダーの識別情報
- 各環境カードは常時展開とし、ヘッダーに以下を表示します。
  - 環境名（デフォルト環境は固定タイトル、カスタム環境は鉛筆アイコン付きインライン編集入力欄）
  - **ミニバッジ (`.env-header-mini-badge`)**: 現在のバッジ文字（最大4文字・大文字。空欄時は環境IDや環境名からのフォールバック）と配色（不正カラー入力時はフォールバック色）をリアルタイム反映したピル表示。
  - **ルール件数バッジ (`.env-header-rules-badge`)**: 登録されている URL パターン件数を言語に応じた単数・複数ラベル（例: `3件のルール` / `1 rule` / `3 rules`）でリアルタイム更新表示。
  - 操作ボタン：「編集内容を取り消す」ボタン、およびカスタム環境のみ削除確認ダイアログ付き削除ボタン。

### 4.2 タブ切り替え構造（`EnvSectionTab: 'urls' | 'appearance'`）
- **タブ 1:「URLパターン (`urls`)」**（デフォルト選択）
  - タブ見出しにパターン件数バッジを併記します。
  - カード全幅を使って `HostnameList.vue` を表示し、ポート番号やパスを含む長い URL や正規表現を快適に編集できます。
  - 一覧上部に、ポート番号（`:3000`）やパス（`/stg`）も指定可能であることを示す簡潔な書き方ヒントを表示します。
  - ドラッグ＆ドロップ用ハンドルによる並び替え、行ごとの有効/無効トグル、`Regex` 切替、削除ボタン（最後の1行は削除不可）を備えます。
  - URL チェッカーで該当環境が一致した際は、自動的にこのタブへ切り替わります。
- **タブ 2:「デザイン・表示設定 (`appearance`)」**
  - デスクトップ幅では幅広な2カラムグリッド（720px 以下では1カラム縦積み）で「バッジ設定 (`.badge-settings-box`)」と「機能トグル群」を配置します。
  - **バッジ設定**: バッジ文字（最大4文字）、文字色（ColorPicker + HEX 入力）、フチ色（ColorPicker + HEX 入力）。
  - **機能トグルとスマート連動**: Favicon 書き換え・ページ内バッジ表示・コンソールログ出力を個別に ON/OFF できます。ページ内バッジを OFF にした場合は付随する「表示位置」と「文字サイズ」欄を非表示にし、再度 ON にした際は元の設定値を保持したまま再表示します。

---

## 5. ヘルプツアー（オンボーディング）のタブ自動切替・フォーカス仕様

`src/options/composables/useTour.ts` および `App.vue` / `EnvSection.vue` の連携により、タブ化された環境カード内でも確実に目的の設定項目へフォーカスを合わせます。

### 5.1 ステップ構成と順序（全7ステップ）
1. ウェルカム案内（画面中央）
2. **URLパターンの設定**: `#env-section-prod .hostname-custom-input-group`（必要タブ: `prod` の `urls`）
3. **バッジのカスタマイズ**: `#env-section-prod .badge-settings-box`（必要タブ: `prod` の `appearance`）
4. URLチェッカー: `#url-checker-card`
5. 環境の追加: `#add-env-button`
6. 自動保存ステータス: `#save-status`
7. 完了案内（画面中央）

### 5.2 タブ自動連動・フォーカス計算・スクロール制御
- **双方向の自動タブ切替**: `intro.onBeforeChange`（非同期）にて、進む・戻るのどちらの遷移でも対象ステップに必要なタブへ `App.vue` 経由で自動切替します。
- **DOM・描画確定待機**: `TabPanel` は `lazy` を使わず DOM 要素を常時保持したうえで、タブ切替後に Vue の `nextTick()` およびブラウザ描画フレーム（`requestAnimationFrame`）の確定を待ってからハイライト枠の位置・サイズを計算します。
- **必要最小限のスクロール制御**:
  - 環境カード内ステップでは `intro.js` 標準の中央寄せスクロールを無効化し、環境名ヘッダーとタブ一覧が画面上端から隠れない範囲で、対象要素と吹き出しが見える最小限のスクロール量に抑えます。
  - URLチェッカー（`#url-checker-card`）や固定フッター要素でも、すでに画面内に収まっている場合は不要なスクロールを行いません。
- **初期状態の復元と多重起動防止**:
  - ツアー開始前に本番環境カードの現在選択タブを記録し、完了時・途中終了時・開始失敗時のいずれでも元のタブへ一度だけ確実に復元します。
  - 実行中のツアーインスタンスを管理して二重起動を防止し、開始直前にトリガー要素のフォーカスを外して Enter キー連打による再発火を防ぎます。

---

## 6. 主要データ構造（`src/types.ts`）

すべてのコンテキスト間で共有する型定義は `src/types.ts` に一元管理しています。

- **`EnvironmentConfig`**: 各環境の設定（`id`, `name`, `badgeText`, `badgeColor`, `badgeOutlineColor`, `faviconEnabled`, `pageBadgeEnabled`, `consoleLogEnabled`, `pageBadgePosition`, `pageBadgeFontSize`, `hostnames`, `isDeletable`）。
- **`HostnamePattern`**: 単一の URL パターンまたは正規表現ルール（`value`, `isRegex`, `enabled`）。
- **`ParsedUrlPattern` / `TargetLocation` / `MatchSpecificity` / `EnvMatchDetail`**: URL の構造化解析、ロケーション正規化、詳細度比較ベクトル、および最終採用結果（ポップアップ編集可否フラグ `isExactHostPortMatch` を含む）。
- **`ValidationErrorItem` / `EnvValidationErrorState` / `EnvironmentsValidationResult` / `LocalizedValidationErrorGroup`**: 保存前の一括検証結果、入力欄別エラー状態、および多言語ポップオーバー表示用グループ構造。
- **`SyncData` / `SessionData` / `RuntimeRequestMessage` / `TabUrlChangedMessage`**: Chrome Storage スキーマおよびコンテキスト間メッセージ型。
