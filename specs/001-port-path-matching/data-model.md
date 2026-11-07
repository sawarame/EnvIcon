# データモデル設計書 (Data Model): ポート番号・URLパス対応の環境マッチング

**対象機能**: [spec.md](./spec.md) (`001-port-path-matching`)
**作成日**: 2026-11-07

---

## 1. 永続化・セッションデータモデル (`src/types.ts`)

既存の Chrome Storage スキーマ構造を完全維持し、マイグレーションなしで後方互換性を保証する。

### 1.1 `HostnamePattern`（URLパターン設定ルール）
`chrome.storage.sync` の `EnvironmentConfig.hostnames` 配列に格納される単一パターン定義。

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `value` | `string` | Yes | 正規化済みの通常パターン文字列（`hostname[:port][/path]`）または正規表現文字列 |
| `isRegex` | `boolean` | Yes | `true` の場合は正規表現として評価、`false` の場合は構造化URLパターンとして評価 |
| `enabled` | `boolean` | No | パターンの有効/無効フラグ（省略時は `true` として扱う） |

#### バリデーション・正規化規則（`FR-001`〜`FR-004`）
- **通常モード (`isRegex: false`)**:
  - 前後の空白を除去し、空文字の行は保存対象から除外する（UI上は最低1行の空入力欄を許容）。
  - プロトコルが指定されている場合、`http://` または `https://` 以外は無効（エラー）とする。
  - クエリ（`?...`）およびハッシュ（`#...`）は切り捨てる。
  - `hostname` は小文字化し、有効なドメイン名 / `localhost` / IPv4 / IPv6 ブラケット形式であることを検証する。
  - `port` が指定されている場合、`1〜65535` の整数であることを検証する。`http://` での `:80` および `https://` での `:443` は標準ポート省略形（ポート指定なし）として正規化する。
  - `path` が存在する場合、大文字・小文字を保持したまま末尾の `/` をすべて除去する。`/` のみの場合はパスなし（空文字）とする。
  - 正規化後の文字列キー `pattern:${normalizedValue}` が全環境を通じて一意であることを検証する（重複時はエラー）。
- **正規表現モード (`isRegex: true`)**:
  - `new RegExp(value.trim())` が例外なくコンパイル可能であることを検証する。
  - 文字列キー `regex:${value.trim()}` が全環境を通じて一意であることを検証する（重複時はエラー）。

---

### 1.2 `EnvironmentConfig`（環境設定）
`chrome.storage.sync` の `environments` 配列要素。既存フィールドに変更はない。

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `id` | `string` | Yes | 環境識別子（`"prod"` \| `"stg"` \| `"dev"` \| `"custom_<timestamp>"`） |
| `name` | `string` | Yes | 環境表示名（空文字・空白のみは不可） |
| `badgeText` | `string` | Yes | バッジ表示文字列（最大4文字） |
| `badgeColor` | `string` | Yes | バッジ文字色（有効な3/4/6/8桁 HEX 形式） |
| `badgeOutlineColor` | `string` | Yes | バッジ輪郭色（有効な3/4/6/8桁 HEX 形式） |
| `faviconEnabled` | `boolean` | No | Favicon 書き換え有効フラグ（デフォルト: `true`） |
| `pageBadgeEnabled` | `boolean` | No | ページ内バッジ表示有効フラグ（デフォルト: `true`） |
| `consoleLogEnabled` | `boolean` | No | DevTools コンソール出力有効フラグ（デフォルト: `true`） |
| `pageBadgePosition` | `PageBadgePosition` | No | ページ内バッジ表示位置（デフォルト: `'bottom-right'`） |
| `pageBadgeFontSize` | `number` | No | ページ内バッジ文字サイズ（`1〜500`、デフォルト: `24`） |
| `hostnames` | `HostnamePattern[]` | Yes | URLパターン設定ルールの配列 |
| `isDeletable` | `boolean` | Yes | 削除可否フラグ（`prod`/`stg`/`dev` は `false`） |

---

### 1.3 `SessionData`（一時OFF状態データ）
`chrome.storage.session` に保存され、ブラウザ終了時に自動消去されるデータ。

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `globalDisabled` | `boolean` | No | `true` の場合、全サイトでバッジ表示を一時停止 |
| `disabledHostnames` | `string[]` | No | サイト単位で一時OFF中の `hostname[:port]`（小文字、例: `"localhost:3000"`, `"example.com"`）の配列 |

---

## 2. ランタイム評価モデル (`src/types.ts` / `src/features/utils.ts`)

ストレージには保存せず、URL判定・優先度計算・UI連携のためにメモリ上で生成されるドメインモデル。

### 2.1 `ParsedUrlPattern`（構造化パターン解析結果）
通常モードの入力文字列を正規化・分解した結果を表すモデル。

| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `normalized` | `string` | 正規化済みパターン文字列（`hostname[:port][/path]`） |
| `hostname` | `string` | 小文字化されたホスト名（例: `"localhost"`, `"example.com"`） |
| `port` | `string` | 指定されたポート番号文字列（未指定または標準ポート省略時は `""`） |
| `path` | `string` | 先頭 `/` を含み末尾 `/` を除いたケース維持パス（未指定時は `""`、例: `"/stg/v1"`） |
| `pathSegmentCount` | `number` | パスのセグメント数（未指定時は `0`、`"/stg"` は `1`、`"/stg/v1"` は `2`） |

---

### 2.2 `TargetLocation`（評価対象ロケーション）
現在開いているタブのURL、またはURLチェッカーに入力されたURLから抽出される検査対象情報。

| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `hostname` | `string` | 小文字ホスト名（例: `"localhost"`） |
| `port` | `string` | URL上の非標準ポート番号（標準ポート時は `""`、例: `"3000"`） |
| `effectivePort` | `string` | プロトコル既定値を含む実効ポート番号（`http:` は `"80"`、`https:` は `"443"`、非標準時はその値） |
| `hostWithPort` | `string` | ポップアップ表示・一時OFF識別用の `hostname[:port]`（例: `"localhost:3000"`, `"example.com"`） |
| `pathname` | `string` | ケース維持されたURLパス（最低 `"/"`、末尾スラッシュ除去版も比較時に利用） |
| `hostAndPath` | `string` | 正規表現評価用の `hostWithPort + pathname`（例: `"localhost:3000/stg/users"`） |

> **制約**: `http:` / `https:` 以外のスキーム、および Chrome ウェブストア制限ページの場合は `null`（サポート対象外）として扱う。

---

### 2.3 `MatchSpecificity`（優先度比較ベクトル）
複数のパターンが `TargetLocation` に一致した際の勝敗を決める比較構造（`FR-008`）。

| 優先順 | フィールド名 | 型 | 比較規則 |
| :---: | :--- | :--- | :--- |
| 1 | `tier` | `1 \| 2 \| 3` | 降順（`3`: パスあり ＞ `2`: ポートあり ＞ `1`: ホストのみ） |
| 2 | `isExactRule` | `0 \| 1` | 降順（`1`: 通常パターン ＞ `0`: 正規表現パターン） |
| 3 | `pathSegmentCount` | `number` | 降順（パスの階層が深いほど優先） |
| 4 | `pathLength` | `number` | 降順（パスの文字数が長いほど優先） |
| 5 | `hasPort` | `0 \| 1` | 降順（同一パス階層では `1`: ポート指定あり ＞ `0`: ポート指定なし） |
| 6 | `envIndex` | `number` | 昇順（`environments` 配列の上から順） |
| 7 | `patternIndex` | `number` | 昇順（該当環境内 `hostnames` 配列の上から順） |

---

### 2.4 `EnvMatchDetail`（環境マッチング結果）
既存の `EnvMatchDetail` を拡張し、ポップアップロック判定およびURLチェッカーの行特定に必要なメタデータを保持する。

| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `env` | `EnvironmentConfig` | 最終的に採用された環境設定 |
| `envIndex` | `number` | 採用された環境の `environments` 配列内インデックス |
| `pattern` | `HostnamePattern` | 採用されたパターン設定 |
| `patternIndex` | `number` | 採用されたパターンの `env.hostnames` 配列内インデックス |
| `isRegexMatch` | `boolean` | 正規表現による一致かどうか |
| `isExactHostPortMatch` | `boolean` | 通常パターンかつ正規化値が対象 `TargetLocation.hostWithPort` と完全一致するか（`true` のときのみポップアップで編集・解除可） |

---

## 3. エンティティ関係と状態遷移

### 3.1 リレーション概要
- 1つの `SyncData` は複数の `EnvironmentConfig` を順序付きで保持する（1対多）。
- 1つの `EnvironmentConfig` は複数の `HostnamePattern` を順序付きで保持する（1対多）。
- 1つの `TargetLocation` と `EnvironmentConfig[]` をマッチング評価器に入力すると、`MatchSpecificity` による優先度解決を経て高々1つの `EnvMatchDetail`（または未一致 `null`）が出力される。

### 3.2 画面内遷移時の状態遷移（Content Script 内）
コンテンツスクリプト内のURL監視およびコンソールロガーは以下の状態遷移を持つ：

```text
[初期ロード: URL_A]
   ├─ マッチ環境 = Env_1 ──> Favicon(Env_1), Badge(Env_1), ConsoleLog(Env_1 出力, _lastLoggedEnvId = "Env_1")
   └─ マッチなし / 一時OFF ─> 変更なし (_lastLoggedEnvId = null)

[SPA画面内遷移: URL_A → URL_B (hostWithPort + pathname が変化)]
   ├─ マッチ環境 = Env_1（変化なし）
   │    └─> Favicon再確認, Badge再確認, ConsoleLog(出力スキップ: _lastLoggedEnvId === "Env_1")
   ├─ マッチ環境 = Env_2（別環境へ変化）
   │    └─> Favicon(Env_2へ更新), Badge(Env_2へ更新), ConsoleLog(Env_2 出力, _lastLoggedEnvId = "Env_2")
   └─ マッチなし または 一時OFF（対象外へ離脱）
        └─> Favicon(元サイトの状態へ完全復元), Badge(DOMから除去), ConsoleLog(_lastLoggedEnvId = null)
```
