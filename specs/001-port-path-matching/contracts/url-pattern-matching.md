# インターフェース契約: URLパターン文法・正規化・評価仕様

**対象機能**: [spec.md](../spec.md) (`001-port-path-matching`)
**作成日**: 2026-11-07

---

## 1. 通常パターン入力文法（Grammar & Normalization Contract）

ユーザーがオプション設定画面またはインポート JSON で指定可能な通常パターン（`isRegex: false`）の受け入れ形式と正規化出力を定義する。

### 1.1 受け入れ構文
```text
[ "http://" | "https://" ] <hostname> [ ":" <port> ] [ "/" <path> ] [ "?" <query> ] [ "#" <hash> ]
```

### 1.2 正規化変換テーブル

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

---

## 2. マッチング評価契約（Matching Evaluation Contract）

### 2.1 通常パターン（`isRegex: false`）の一致条件
対象ページの `TargetLocation` に対し、以下の **3条件すべて** を満たす場合に一致とする：
1. **ホスト名一致**: `pattern.hostname === target.hostname`（双方小文字）
2. **ポート一致**: `pattern.port === ""`（ポート指定なし）、または `pattern.port === target.port`（もしくは明示標準ポート指定時に `pattern.port === target.effectivePort`）
3. **パス一致**: `pattern.path === ""`（パス指定なし）、または以下のいずれかを満たす（大文字・小文字区別あり）：
   - `targetNormalizedPath === pattern.path`
   - `targetNormalizedPath.startsWith(pattern.path + "/")`

### 2.2 正規表現パターン（`isRegex: true`）の一致条件
`regex = new RegExp(pattern.value.trim())` としたとき、以下のいずれかを満たす場合に一致とする：
1. `regex.test(target.hostAndPath)` が `true`（ルート `/` の場合は `target.hostWithPort` 単体へのテストも含む）
2. パターン文字列に `:` と `/` のいずれも含まれない場合において、`regex.test(target.hostname)` が `true`（既存ホスト名正規表現の後方互換保証）

---

## 3. UI 契約（Popup & Options UI Contract）

### 3.1 クイック操作ポップアップの操作契約
- **表示対象ラベル**: アクティブタブの `target.hostWithPort`（例: `localhost:3000` または `example.com`）を表示する。
- **ワンクリック登録**: 選択した環境の `hostnames` 末尾に `{ value: target.hostWithPort, isRegex: false, enabled: true }` を追加し、他環境に同一の `value`（通常パターン）があれば除去する。
- **ロック状態の条件**: `matchDetail !== null && !matchDetail.isExactHostPortMatch` の場合、環境選択ボタンリストを非表示にし、ロック案内ボックス（一致中の環境名・バッジ・パターン文字列 `matchDetail.pattern.value`・設定画面を開くボタン）を表示する。
- **サイト単位の一時OFF**: ロック状態の有無にかかわらず常に操作可能とし、`SessionData.disabledHostnames` に対して `target.hostWithPort` を追加・削除する。

### 3.2 オプション設定画面 URL チェッカーの表示契約
- 入力された検証用 URL がサポート対象外または不正構文の場合は未判定（または不一致）とする。
- 一致した場合、優先度評価で選ばれた単一の `EnvMatchDetail` に基づき：
  1. チェッカー結果欄に `matchDetail.env` のバッジを表示する。
  2. 全環境・全パターン行のうち、`envIndex === matchDetail.envIndex && patternIndex === matchDetail.patternIndex` に該当する **1行のみ** に `.match-success` クラスを付与する。
