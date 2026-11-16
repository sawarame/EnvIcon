# データモデル設計書 (Data Model): ヘルプツアーにおける「バッジのカスタマイズ」タブ自動切替とフォーカス復元

**Feature Branch**: `004-fix-tour-badge-focus` | **Date**: 2026-11-16

本修正では Chrome Storage（`sync` / `local` / `session`）の永続化スキーマは一切変更せず、Options 画面の UI 状態管理およびツアー制御用のメモリ上データモデルのみを追加・整理する。

## 1. 共有型・インターフェース定義

### `EnvSectionTab` (`src/types.ts`)

環境設定カード内のタブ識別子を表すリテラル共用体型。

| 値 | UI表示名（日本語 / 英語） | 内容 |
| :--- | :--- | :--- |
| `'urls'` | URLパターン / URL Patterns | ホスト名・ポート・パス等のURLパターン一覧（既定タブ） |
| `'appearance'` | デザイン・表示設定 / Badge & Display | バッジ外観設定（文字・文字色・枠線色）および機能トグル群 |

### `TourTabController` / `UseTourOptions` (`src/options/composables/useTour.ts`)

`useTour` が親画面（`App.vue`）の環境タブ状態を読み書きするための依存注入インターフェース。

| フィールド | 型 | 説明 |
| :--- | :--- | :--- |
| `getEnvTab` | `(envId: string) => EnvSectionTab` | 指定した環境IDの現在の選択タブを取得する（未設定時は `'urls'`） |
| `setEnvTab` | `(envId: string, tab: EnvSectionTab) => Promise<void> \| void` | 指定した環境IDのタブを切り替え、必要なら描画反映まで待機する |

## 2. ツアーステップと必要タブのマッピング

`useTour.ts` 内の全7ステップ（0始まりインデックス）と、各ステップが要求するタブ・スクロール制御の対応関係。

| ステップIndex | ステップタイトル | 対象要素セレクタ | 対象環境 / 必要タブ | `scrollToElement` |
| :---: | :--- | :--- | :--- | :---: |
| `0` | EnvIconへようこそ！ | なし（フローティング表示） | 切替なし | `true` |
| `1` | URLパターンの設定 | `#env-section-prod .hostname-custom-input-group` | `prod` / `'urls'` | `false`（タブ見切れ防止の自前スクロール） |
| `2` | バッジのカスタマイズ | `#env-section-prod .badge-settings-box` | `prod` / `'appearance'` | `false`（タブ見切れ防止の自前スクロール） |
| `3` | 設定をテスト | `#url-checker-card` | 切替なし | `false`（画面内表示時はスクロールなし・画面外時のみ最小限調整） |
| `4` | カスタム環境を追加 | `#add-env-button` | 切替なし | `false` |
| `5` | 自動保存 | `#save-status` | 切替なし | `false` |
| `6` | 最後に | なし（フローティング表示） | 切替なし | `true` |

## 3. ツアー実行中の状態遷移

```text
[ツアー未実行]
  │ startTour() 呼び出し
  ▼
[開始前状態スナップショット保存]
  │ initialProdTab = getEnvTab('prod')
  ▼
[ステップ遷移ループ (onBeforeChange)]
  ├─ Step 1 (URLパターンの設定)
  │    └─ getEnvTab('prod') !== 'urls' の場合、setEnvTab('prod', 'urls') ＆ レイアウト待機 → タブ見切れ防止スクロール
  ├─ Step 2 (バッジのカスタマイズ)
  │    └─ getEnvTab('prod') !== 'appearance' の場合、setEnvTab('prod', 'appearance') ＆ レイアウト待機 → タブ見切れ防止スクロール
  └─ その他ステップ
       └─ タブ切替なし（直前のタブ状態を維持。Step 4/5 のみ scrollToElement: false）
  │
  ▼ 完了 (onComplete) / スキップ・ESC・強制終了 (onExit) / 起動失敗 (finally)
[タブ状態復元 & クリーンアップ]
  │ setEnvTab('prod', initialProdTab)（開始時と異なる場合のみ復元）
  │ activeTour = null
  ▼
[通常操作へ復帰]
```

## 4. 不変条件 (Invariants)

- ツアーが開始されていない状態では、`envTabs` の値はユーザーのタブクリック操作および URL チェッカーの一致イベント（`matchedPatternIndex` watch）のみで更新される。
- `startTour()` が二重起動防止（`activeTour !== null`）で弾かれた場合、`initialProdTab` の上書きや復元処理は走らない。
- ステップ遷移の往復（「次へ」⇔「戻る」）を何度繰り返しても、Step 1 では常に `'appearance'`、Step 2 では常に `'urls'` がアクティブな状態で `showElement` が実行される。
