# UIコンポーネントおよびインターフェース契約書 (Options UI Contracts)

**Branch**: `003-options-ui-redesign` | **Date**: 2026-11-13 | **Spec**: [spec.md](../spec.md)

本ドキュメントは、オプション設定画面のUIレイアウト刷新におけるコンポーネント間のProps/Emits契約、DOMクラス規約、および多言語辞書キー契約を定義します。

---

## 1. コンポーネント契約 (Component Contracts)

### 1.1 `EnvSection.vue` (環境設定カードコンポーネント)

各環境の設定全体を左右2カラムで描画するメインカードコンポーネントです。

#### Props

```typescript
interface EnvSectionProps {
  /** 対象環境の設定データ（双方向バインディング対象） */
  envConfig: EnvironmentConfig;
  /** URLチェッカーでこの環境が採用された場合の該当パターン行インデックス（非該当時は null） */
  matchedPatternIndex?: number | null;
  /** この環境のバリデーションエラー状態 */
  validationError?: EnvValidationErrorState;
}
```

#### Emits

```typescript
interface EnvSectionEmits {
  /** 環境設定の更新イベント（v-model:envConfig 連動） */
  (e: 'update:envConfig', value: EnvironmentConfig): void;
  /** 環境削除イベント（カスタム環境のみ） */
  (e: 'delete', id: string): void;
  /** 編集内容の直前保存状態への取り消しイベント */
  (e: 'undo'): void;
}
```

#### スロットおよびレイアウト構造

```html
<Card class="env-card">
  <!-- ヘッダー: タイトル / 鉛筆 / ミニバッジ / 件数バッジ / アクションボタン -->
  <template #title>
    <div class="card-header-flex">
      <div class="header-title-area">
        <!-- デフォルト名 または インライン入力 -->
        <!-- NEW: ミニバッジ (.env-header-mini-badge) -->
        <!-- NEW: 件数バッジ (.env-header-rules-badge) -->
      </div>
      <div class="header-actions">
        <!-- 元に戻すボタン / 削除ボタン -->
      </div>
    </div>
  </template>

  <!-- 本文: 左右2カラムレイアウト -->
  <template #content>
    <div class="env-card-two-columns">
      <!-- 左カラム: バッジ設定 & 表示トグル -->
      <div class="env-card-left-column">
        <!-- 1. リアルタイムプレビュー領域 (.badge-live-preview) -->
        <!-- 2. バッジ文字 & カラー設定 (.badge-appearance-section) -->
        <!-- 3. 機能トグル群 (.badge-features-section) -->
        <!--    - Faviconトグル -->
        <!--    - ページ内バッジトグル ＋ (ON時のみ) 位置・サイズ設定 -->
        <!--    - コンソールログトグル -->
      </div>

      <!-- 右カラム: 対象URLパターン一覧 -->
      <div class="env-card-right-column">
        <!-- HostnameList.vue (見出し・ヒント付き) -->
      </div>
    </div>
  </template>
</Card>
```

---

### 1.2 `HostnameList.vue` (ホスト名・URLパターン一覧コンポーネント)

右カラムに収容され、パターンの追加・編集・並び替え・削除を管理するコンポーネントです。

#### Props

```typescript
interface HostnameListProps {
  /** パターン設定オブジェクトの配列（v-model 連動） */
  modelValue: HostnamePattern[];
  /** URLチェッカーで最終的に採用されたパターンの行インデックス（未採用時は null） */
  matchedPatternIndex?: number | null;
  /** バリデーションエラーが発生している行インデックスの配列 */
  invalidIndices?: number[];
}
```

#### Emits

```typescript
interface HostnameListEmits {
  /** パターン配列の更新イベント */
  (e: 'update:modelValue', value: HostnamePattern[]): void;
}
```

#### 内部レイアウト構造

```html
<div class="hostname-list-container">
  <!-- 見出しと書き方ヒント -->
  <div class="hostname-section-header">
    <div class="hostname-header-title">
      <i class="pi pi-link"></i>
      <span>{{ t('hostnamePatterns') }}</span>
    </div>
    <div class="hostname-header-hint">
      <i class="pi pi-info-circle"></i>
      <span>{{ t('urlPatternsHint') }}</span>
    </div>
  </div>

  <!-- 行リスト（ドラッグ＆ドロップ対応） -->
  <div class="hostname-rows-group">
    <!-- 各行: ドラッグハンドル / 有効トグル / Regex / InputText / 削除 -->
  </div>

  <!-- パターン追加ボタン -->
  <Button 
    icon="pi pi-plus" 
    :label="t('addHostname')" 
    @click="addInput" 
  />
</div>
```

---

## 2. スタイルおよびカラートークン規約 (Style & Token Rules)

PrimeVue v4 および `App.css` の既存トークンに従い、ライト/ダーク両モードで適切なコントラストを確保します。

| クラス名 | 用途 | 主要 CSS プロパティ |
| :--- | :--- | :--- |
| `.env-card-two-columns` | 左右2カラムグリッド | `display: grid; grid-template-columns: minmax(320px, 1fr) minmax(380px, 1.2fr); gap: 1.5rem;`（狭幅時は `1fr` 縦積み） |
| `.badge-live-preview` | リアルタイムプレビュー枠 | `background: var(--item-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; padding: 1rem;` |
| `.preview-favicon-box` | Favicon風アイコン箱 | `width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: flex-end; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);` |
| `.preview-page-badge-box`| ページ内バッジ風表現 | `padding: 4px 10px; border-radius: 6px; font-weight: bold; opacity: 0.7; font-size: 16px;` |
| `.env-header-mini-badge`| ヘッダー用ミニピル | `padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; border: 1px solid;` |
| `.env-header-rules-badge`| ヘッダー用件数バッジ | `font-size: 0.75rem; color: var(--text-secondary); background: var(--item-bg); padding: 2px 8px; border-radius: 9999px;` |
| `.hostname-header-hint` | URL書き方ヒント文 | `font-size: 0.8125rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.375rem;` |

---

## 3. 多言語辞書キー契約 (i18n Translation Contract)

`src/options/i18n.ts` に追加する辞書キー契約です。

```typescript
export const translations = {
  en: {
    // 既存キー...
    badgePreview: "Badge Preview",
    previewFaviconLabel: "Favicon",
    previewPageBadgeLabel: "Page Badge",
    urlPatternsHint: "You can specify port numbers (:3000) and paths (/stg) in addition to hostnames.",
    rulesCountSingular: "{count} rule",
    rulesCountPlural: "{count} rules",
  },
  ja: {
    // 既存キー...
    badgePreview: "バッジプレビュー",
    previewFaviconLabel: "Favicon",
    previewPageBadgeLabel: "ページ内バッジ",
    urlPatternsHint: "ホスト名に加え、ポート番号（:3000）やパス（/stg）も指定可能です。",
    rulesCountSingular: "{count} 件のルール",
    rulesCountPlural: "{count} 件のルール",
  }
};
```
