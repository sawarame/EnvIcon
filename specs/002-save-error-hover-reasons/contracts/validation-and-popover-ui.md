# インターフェースおよびUI契約 (Contract): 保存検証と不備理由ポップオーバー

**対象機能**: [spec.md](../spec.md) (`002-save-error-hover-reasons`)
**作成日**: 2026-11-08

---

## 1. 環境設定バリデーション関数契約 (`src/options/utils.ts`)

### 1.1 `validateEnvironments`
オプション設定画面の `environments` 配列を受け取り、保存可能な正規化データと構造化エラー情報を一括算出する純粋関数。

```typescript
export function validateEnvironments(
  environments: EnvironmentConfig[]
): EnvironmentsValidationResult;
```

#### 評価順序および不変条件
1. `environments` 配列の先頭（インデックス `0`）から末尾へ順番に走査する。
2. 各環境内では、画面上のレイアウト順序に合わせて以下の順で検証し、不備があれば `errorItems` と `fieldErrorsByEnv[env.id]` の双方へ同時に記録する：
   1. `name`: `env.name.trim() === ""` → `'empty_name'` / `invalidName = true`
   2. `badgeColor`: 空でなく HEX 正規表現 `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/` 不一致 → `'invalid_badge_color'` / `invalidBadgeColor = true`
   3. `badgeOutlineColor`: 空でなく上記 HEX 正規表現不一致 → `'invalid_badge_outline_color'` / `invalidBadgeOutlineColor = true`
   4. `pageBadgeFontSize`: `env.pageBadgeEnabled !== false` のときのみ評価。数値でない、`NaN`、または `< 1` もしくは `> 500` → `'invalid_font_size'` / `invalidPageBadgeFontSize = true`
   5. `hostnames`: インデックス `0` から順に走査。`hn.value.trim() === ""` の空行はスキップし、非空行について：
      - `hn.isRegex === true`: `new RegExp(rawValue)` が例外を投げれば `'invalid_regex_pattern'`（`patternValue: rawValue`）、成功すれば重複判定キー `regex:${rawValue}` を生成。
      - `hn.isRegex === false`: `normalizeUrlPattern(rawValue)` が `null` なら `'invalid_url_pattern'`（`patternValue: rawValue`）、成功すれば正規化値と重複判定キー `pattern:${normalized}` を生成。
      - 構文・形式が有効な行について、重複追跡マップ `seenPatterns` に既に同一キーが存在すれば `'duplicate_pattern'`（初出の `origin.envId === env.id` なら `isSameEnvDuplicate: true`、異なれば `duplicateOfEnvId` / `duplicateOfCustomName` を設定）を記録し、当該行インデックスを `invalidPatternIndices` に追加する。初出であれば `seenPatterns` に登録する。
3. **一貫性保証**: ある環境において `fieldErrorsByEnv[env.id]` のいずれかのフラグが真（または `invalidPatternIndices.length > 0`）であることと、`errorItems` 内に `item.envId === env.id` の要素が1件以上存在することは常に同値となる（`SC-002`）。

---

## 2. 多言語翻訳・補間契約 (`src/options/i18n.ts`)

### 2.1 プレースホルダー補間対応 `t()`
```typescript
export function t(
  key: TranslationKey,
  params?: Record<string, string | number>
): string;
```
- `params` が指定された場合、翻訳テンプレート内の `{key}` トークンを対応する文字列値へ置換する（正規表現特殊文字や `$` 記号がユーザー入力パターンに含まれていても誤動作しないよう関数置換またはリテラル置換を行う）。

### 2.2 追加する翻訳キー定義（日英ペア）

| キー名 | 日本語 (`ja`) | 英語 (`en`) |
| :--- | :--- | :--- |
| `saveErrorDetailsTitle` | `保存できない理由` | `Reasons changes cannot be saved` |
| `unnamedEnvironment` | `（名称未設定の環境）` | `(Unnamed Environment)` |
| `validationEmptyName` | `環境名が入力されていません` | `Environment name is required` |
| `validationInvalidBadgeColor` | `バッジの「色」が正しいカラーコード形式（例: #ff0000）ではありません` | `Badge "Color" is not a valid hex color code (e.g. #ff0000)` |
| `validationInvalidBadgeOutlineColor` | `バッジの「フチ色」が正しいカラーコード形式（例: #ffffff）ではありません` | `Badge "Outline" is not a valid hex color code (e.g. #ffffff)` |
| `validationInvalidFontSize` | `ページ内バッジの「文字サイズ」が有効範囲外です` | `Page badge "Font Size" is out of valid range` |
| `validationInvalidUrlPattern` | `URLパターン「{pattern}」の形式が無効です` | `URL pattern "{pattern}" is invalid` |
| `validationInvalidRegexPattern` | `正規表現パターン「{pattern}」に構文エラーがあります` | `Regex pattern "{pattern}" has a syntax error` |
| `validationDuplicateSameEnv` | `パターン「{pattern}」が同じ環境内で重複しています` | `Pattern "{pattern}" is duplicated within the same environment` |
| `validationDuplicateOtherEnv` | `パターン「{pattern}」が「{targetEnv}」と重複しています` | `Pattern "{pattern}" duplicates a pattern in "{targetEnv}"` |

> **長文入力値の安全整形**: `{pattern}` に埋め込む文字列が 80 文字を超える場合は、先頭 80 文字＋`...` に切り詰めた上で埋め込み、さらに CSS `overflow-wrap: anywhere` を併用して吹き出しの横幅破綻を防止する。

---

## 3. 保存ステータス・不備理由吹き出しコンポーネント契約 (`src/options/components/SaveStatusIndicator.vue`)

### 3.1 Props 契約
```typescript
interface SaveStatusIndicatorProps {
  /** 現在の保存ステータス ('saved' | 'saving' | 'error') */
  saveStatus: 'saved' | 'saving' | 'error';
  /** 構造化バリデーションエラー項目の配列 */
  errorItems: ValidationErrorItem[];
}
```

### 3.2 DOM・レイアウト・アクセシビリティ契約
- **ツアー互換ID**: ステータスピル要素には必ず `id="save-status"` を付与する（`intro.js` のステップ対象維持）。
- **視覚的アフォーダンス（`FR-009`）**:
  - `saveStatus === 'error'` のときのみ、ピル要素にエラースタイル（アンバー系の枠線・背景強調、`cursor: help`）および右端の補助インジケーター（情報アイコン `pi pi-info-circle` 等）を表示し、マウスオーバー可能であることを直感的に示す。
  - `saveStatus !== 'error'` のときは通常のカーソルとし、吹き出し DOM は非表示（レンダリングしない）とする（`FR-002`）。
- **配置とサイズ制約（`FR-007`）**:
  - ラッパー要素に `position: relative` を設定し、吹き出し本体は `position: absolute; bottom: calc(100% + 10px); right: 0;` で常にピル要素の上方・右端揃えに配置する。
  - 幅: `min(440px, calc(100vw - 3rem))`（最小幅 `280px`）。
  - スクロール領域の最大高さ: `min(300px, calc(100vh - 140px))`、`overflow-y: auto` により 10件以上のエラー発生時も画面外へ見切れず全件スクロール閲覧可能にする。
- **インタラクションとキーボード対応（`FR-007`, `FR-009`）**:
  - ピル要素と吹き出し本体の双方でマウス進入・離脱を監視し、`10px` の隙間を埋める透明ブリッジ＋`120ms` のクローズ遅延により、吹き出し上へのカーソル移動とスクロール操作を途切れさせない。
  - `saveStatus === 'error'` 時のみピル要素に `tabindex="0"` と `aria-expanded` / `aria-controls` を付与し、`focusin` で表示・領域外への `focusout` または `Escape` キー押下で閉じる。
- **テーマ連動（`FR-010`）**:
  - 背景色に `var(--card-bg)`、枠線に `var(--border-color)`、主要文字色に `var(--text-primary)`、補助文字色に `var(--text-secondary)` を使用し、ライトモードおよびダークモード（`.my-app-dark`）で十分なコントラストを確保する。
