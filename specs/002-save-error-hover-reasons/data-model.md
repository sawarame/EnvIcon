# データモデル設計書 (Data Model): 保存エラー表示時のマウスオーバーによる不備理由表示

**対象機能**: [spec.md](./spec.md) (`002-save-error-hover-reasons`)
**作成日**: 2026-11-08

---

## 1. ストレージデータへの影響

本機能はオプション設定画面における保存前バリデーション結果のランタイム表現およびUI表示のみを対象とするため、**`chrome.storage.sync`・`chrome.storage.local`・`chrome.storage.session` の永続化スキーマへの変更は一切ない**（既存データに対する 100% 互換性を維持）。

---

## 2. ランタイム検証モデル (`src/types.ts` / `src/options/utils.ts`)

### 2.1 `ValidationErrorKind`（不備理由の種別区分）
自動保存が保留される全7種類の検証エラーを表す文字列リテラル共用体型（`FR-003`）。

| 値 | 対象項目 | 発生条件 |
| :--- | :--- | :--- |
| `'empty_name'` | 環境名 (`name`) | `env.name.trim() === ""` の場合 |
| `'invalid_badge_color'` | バッジ文字色 (`badgeColor`) | 空でなく、有効な HEX カラー形式（`#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`）でない場合 |
| `'invalid_badge_outline_color'` | バッジフチ色 (`badgeOutlineColor`) | 空でなく、有効な HEX カラー形式でない場合 |
| `'invalid_font_size'` | ページ内バッジ文字サイズ (`pageBadgeFontSize`) | `env.pageBadgeEnabled !== false` かつ数値でない、または `1〜500` の範囲外である場合 |
| `'invalid_url_pattern'` | 通常URLパターン (`hostnames[i]`) | `isRegex === false` で空欄でなく、`normalizeUrlPattern` が `null` を返した場合 |
| `'invalid_regex_pattern'` | 正規表現パターン (`hostnames[i]`) | `isRegex === true` で空欄でなく、`new RegExp(rawValue)` が構文エラーを投げた場合 |
| `'duplicate_pattern'` | URL/正規表現パターン (`hostnames[i]`) | 先行する環境または同一環境内の先行行と正規化キー（`pattern:...` / `regex:...`）が一致した場合 |

---

### 2.2 `ValidationErrorItem`（保存検証エラー項目）
個別の入力不備を表す言語非依存の構造化データモデル（`FR-004`, `FR-005`）。

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `envId` | `string` | Yes | 不備が発生している環境の識別子（`"prod"` \| `"stg"` \| `"dev"` \| `"custom_*"`） |
| `envCustomName` | `string` | Yes | トリム済みのカスタム環境名（未入力時は `""`。表示時に代替ラベルまたはデフォルト環境翻訳名へ解決） |
| `kind` | `ValidationErrorKind` | Yes | 不備理由の種別区分（上記7種のいずれか） |
| `patternValue` | `string` | No | パターン行の不備・重複時における該当行のトリム済み入力文字列 |
| `patternRowIndex` | `number` | No | パターン行の不備・重複時における `hostnames` 配列内の 0始まりインデックス |
| `isSameEnvDuplicate` | `boolean` | No | `kind === 'duplicate_pattern'` のとき、同一環境内の先行行との重複であれば `true` |
| `duplicateOfEnvId` | `string` | No | `kind === 'duplicate_pattern'` かつ異環境間重複のとき、重複元（初出側）環境の識別子 |
| `duplicateOfCustomName` | `string` | No | `kind === 'duplicate_pattern'` かつ異環境間重複のとき、重複元環境のトリム済みカスタム環境名 |

---

### 2.3 `EnvValidationErrorState`（環境カード別の赤枠強調状態 — 既存維持）
既存の `EnvSection.vue` / `HostnameList.vue` へ渡される入力欄別の `.p-invalid` 制御用インターフェース。変更なしで維持し、`ValidationErrorItem[]` と同一の走査パスから同時生成することで 100% の整合性（`SC-002`）を保証する。

| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `invalidName` | `boolean` | 環境名が未入力エラーかどうか |
| `invalidBadgeColor` | `boolean` | バッジ文字色が形式不正かどうか |
| `invalidBadgeOutlineColor` | `boolean` | バッジフチ色が形式不正かどうか |
| `invalidPageBadgeFontSize` | `boolean` | ページ内バッジ文字サイズが範囲外かどうか |
| `invalidPatternIndices` | `number[]` | 形式不正・構文エラー・後発重複と判定されたパターン行インデックス配列 |

---

### 2.4 `EnvironmentsValidationResult`（一括検証結果）
`validateEnvironments(environments)` 純粋関数が返す集約オブジェクト。

| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `isValid` | `boolean` | 全環境を通じて不備が 0件であれば `true`（`errorItems.length === 0` と同値） |
| `hasDuplicate` | `boolean` | 重複エラーが1件以上含まれるかどうか（手動保存ショートカット時のトースト分岐用） |
| `normalizedEnvironments` | `EnvironmentConfig[]` | `isValid === true` のときに `chrome.storage.sync` へそのまま保存可能な正規化済み環境配列 |
| `fieldErrorsByEnv` | `Record<string, EnvValidationErrorState>` | 環境IDをキーとする入力欄赤枠強調マップ |
| `errorItems` | `ValidationErrorItem[]` | 画面上の環境順・項目順に整列された全不備項目の配列 |

---

### 2.5 `LocalizedValidationErrorGroup`（UI描画用グループモデル）
`SaveStatusIndicator.vue` 内の `computed` で `ValidationErrorItem[]` と `currentLanguage` から導出される表示用モデル（`FR-006`, `FR-010`）。

| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `envId` | `string` | 環境識別子（`v-for` キー用） |
| `envDisplayName` | `string` | 現在の言語で解決された環境表示名（デフォルト環境は翻訳名、カスタム環境名空欄時は `（名称未設定の環境）` / `(Unnamed Environment)`） |
| `reasons` | `string[]` | その環境に属するローカライズ済みの具体的な不備理由メッセージ配列 |

---

## 3. 状態遷移モデル（保存ステータスと吹き出し開閉）

### 3.1 保存ステータス (`SaveStatus`) の状態遷移
```text
[初期読込完了] ──(validateEnvironments)──> 'saved' (不備なし) / 'error' (初期データ不備時)

[任意の編集操作 (watch)]
  ├─ currentUIState === initialSettingsStr の場合:
  │    └─ タイマークリア ＋ validateEnvironments 即時評価
  │         ├─ isValid === true  ──> saveStatus = 'saved', errorItems = []
  │         └─ isValid === false ──> saveStatus = 'error', errorItems 更新
  │
  └─ currentUIState !== initialSettingsStr の場合:
       └─ saveStatus = 'saving' ──(500ms デバウンス後 executeSave)──>
            ├─ isValid === true  ──> chrome.storage.sync.set 完了後 saveStatus = 'saved', errorItems = []
            └─ isValid === false ──> saveStatus = 'error', errorItems 更新 (ストレージ未保存)
```

### 3.2 吹き出し (`isPopoverOpen`) の表示状態遷移
- **表示開始条件**: `saveStatus === 'error'` かつ `errorItems.length > 0` の状態で、以下のいずれかが発生したとき：
  - 保存ステータス領域（または吹き出し本体）への `mouseenter`
  - 保存ステータス領域へのキーボードフォーカス（`focusin`）
- **表示維持条件**: 保存ステータス領域または吹き出し本体のいずれかにマウスカーソルが乗っている間、またはフォーカスが内部にある間はクローズタイマーをキャンセルして表示を維持する（内部スクロール中も維持）。
- **非表示遷移条件**:
  - 保存ステータス領域および吹き出しの双方からマウスカーソルが離れ（`mouseleave`）、猶予時間（`120ms`）以内に再進入がなく、かつフォーカスも外れているとき
  - キーボードフォーカスが領域外へ移動（`focusout`）し、かつマウスホバー中でないとき
  - `Escape` キーが押下されたとき
  - 編集・修正・Undo・削除等により `saveStatus !== 'error'`（`'saving'` または `'saved'`）へ変化したとき（即時強制クローズ）
