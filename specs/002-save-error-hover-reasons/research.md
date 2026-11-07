# 技術調査・設計判断書 (Research): 保存エラー表示時のマウスオーバーによる不備理由表示

**対象機能**: [spec.md](./spec.md) (`002-save-error-hover-reasons`)
**作成日**: 2026-11-08

---

## 1. 下部固定フッター上の吹き出し配置およびホバー維持・内部スクロール方式

### Decision（決定事項）
- オプション設定画面の下部固定フッター（`.sticky-footer`）内の保存ステータス領域を専用コンポーネント `src/options/components/SaveStatusIndicator.vue` として分離し、アンカー要素（`position: relative`）の直上に `position: absolute; bottom: calc(100% + 10px); right: 0;` で上方向へ展開するカスタムポップオーバーを配置する。
- 保存エラー表示（トリガー）と吹き出し本体の間の余白（`10px`）には透明なホバーブリッジ領域（疑似要素）を設けるとともに、マウス離脱時に短い非表示猶予（`120ms`）を挟むことで、トリガーから吹き出し内部へカーソルを移動しても表示が途切れず維持され、内部の縦スクロール（`max-height: min(320px, calc(100vh - 120px)); overflow-y: auto;`）を行えるようにする。
- キーボード操作に対応するため、保存エラー状態（`saveStatus === 'error'`）のときのみステータスピル要素に `tabindex="0"`・`aria-describedby`（または `aria-expanded`）を付与し、`focusin` / `focusout` および `Escape` キー押下での非表示をサポートする。
- オンボーディングツアー（`intro.js`）が `#save-status` セレクタを直接参照しているため、ステータスピル要素の `id="save-status"` 属性は変更せずそのまま維持する。

### Rationale（選定理由）
- PrimeVue の `Popover` コンポーネントは本来クリック開閉かつ `body` 直下への絶対座標配置（`window.scrollY` 基準）を前提としているため、`position: fixed` の下部フッター上でホバー利用すると、ページスクロール時の追従ズレや、自動保存再評価でエラー件数（高さ）が増減した際の上下位置ズレが生じやすい。
- アンカー要素に対する `bottom: calc(100% + 10px)` 配置であれば、ページスクロールやエラー件数の増減にかかわらず下端が常に保存エラー表示の上端に固定され、画面下端での見切れが原理的に発生しない（`FR-007`, `SC-004`）。また、新規外部パッケージの追加も一切不要である。

### Alternatives Considered（検討した代替案）
- **PrimeVue `v-tooltip` ディレクティブを使用する案**: 非対話型ツールチップのため、吹き出し上にマウスカーソルを移動して内部スクロールする仕様（Clarification Q1 / `FR-007`）を満たせないため却下。
- **PrimeVue `Popover` コンポーネントを `mouseenter` / `mouseleave` で手動制御する案**: `appendTo="body"` による固定フッターとのスクロール乖離や動的リサイズ時の座標再計算が必要となり、複雑性が増すため却下。
- **HTML 標準の `title` 属性を使用する案**: OS 標準ツールチップのため表示遅延があり、ライト/ダークテーマ連動、構造化リスト表示、内部スクロール、キーボードフォーカス表示がいずれも不可能なため却下。

---

## 2. 言語非依存の構造化エラーモデルとリアクティブ多言語解決

### Decision（決定事項）
- バリデーション実行時は翻訳済みのエラー文字列を生成せず、言語非依存の構造化データ `ValidationErrorItem`（対象環境ID、カスタム環境名スナップショット、エラー種別 `ValidationErrorKind`、パターン入力値、重複元環境情報）を生成して保持する。
- `src/options/i18n.ts` の翻訳取得関数 `t()` を拡張し、プレースホルダー補間（例: `{pattern}`, `{targetEnv}`）を型安全に行えるようにする。
- UI 表示時は Vue の `computed` プロパティ内で `currentLanguage` に連動して各 `ValidationErrorItem` をローカライズ文字列へ変換し、環境単位でグループ化（環境見出し ＋ 不備理由リスト）して描画する。

### Rationale（選定理由）
- 保存エラー発生中にユーザーがヘッダーメニューから言語（日本語 ⇄ 英語）を切り替えた際、`environments` データ自体は変更されないため保存処理を再実行しなくても、Vue のリアクティブシステムによって即座にデフォルト環境名・名称未設定ラベル・重複元環境名・各エラー理由文言が選択言語へ切り替わるため（`FR-010`）。
- 1つの環境内に複数の不備がある場合に、環境名の見出しごとに箇条書きで整理表示でき、視認性と一覧性（`FR-004`, `FR-006`, `SC-001`）が向上するため。

### Alternatives Considered（検討した代替案）
- **`executeSave` 内で翻訳済み文字列の配列（`string[]`）を生成して保持する案**: 言語切り替えイベントのたびに再検証を強制呼び出しする必要があり、また環境ごとのグループ化や重複先環境名の動的ローカライズが困難になるため却下。

---

## 3. パターン重複検出における競合元環境の追跡方式

### Decision（決定事項）
- 既存の `seenPatterns: Set<string>` を `Map<string, SeenPatternOrigin>`（初出時の `envId` および表示用カスタム環境名を保持）に置き換える。
- 環境配列の上から順・各環境内のパターン配列の上から順に走査し、初出の正規化キー（通常モードは `pattern:${normalized}`、正規表現モードは `regex:${rawValue}`）を `Map` に登録する。
- 2回目以降に同一キーが出現した行（後発の重複行）のみを `invalidPatternIndices` および `ValidationErrorItem`（`kind: 'duplicate_pattern'`）へ追加する。その際、`origin.envId === env.id` であれば「同一環境内での重複（`isSameEnvDuplicate: true`）」、異なれば「他環境との重複（`duplicateOfEnvId: origin.envId`）」として記録する。

### Rationale（選定理由）
- Clarification Q2 の決定事項に従い、既存の入力フィールド赤枠強調（`.p-invalid`）の対象行と吹き出し内の不備項目を 100% 一致させつつ（`SC-002`）、異なる環境間で競合している場合に「どの環境と重複しているか」を `O(1)` の計算量で正確に提示できるため。

### Alternatives Considered（検討した代替案）
- **重複している先発側・後発側の双方をエラー対象にする案**: 既存の保存検証・赤枠強調ルールを変更することになり、Clarification Q2 にて不採用とした。

---

## 4. 編集取り消し（Undo）・行削除・手動復元時のエラーステータス残留防止

### Decision（決定事項）
- これまで `App.vue` の `executeSave` 内に密結合していた検証・正規化ロジックを、`src/options/utils.ts` 内の副作用を持たない純粋関数 `validateEnvironments(environments: EnvironmentConfig[])` として分離する。
- `App.vue` の `onSettingsChange` において、現在のUI状態が直前の保存済み状態と一致した（`currentUIState === initialSettingsStr`）場合にも、待機中の `autoSaveTimer` を確実にクリアした上で `validateEnvironments` の結果を反映し、不備が 0件であれば `validationErrors` と不備理由一覧をクリアして `saveStatus = 'saved'` へ即座に復帰させる。

### Rationale（選定理由）
- 既存コードでは `currentUIState === initialSettingsStr` 時に `saveStatus` や `validationErrors` を更新せず早期 `return` していたため、未保存エラー発生後に手動修正や「編集内容を取り消す」操作で元の正常な値へ戻した際、`saveStatus` が `'error'` のまま残留するエッジケースが存在した。検証関数を純粋化してこの経路でも状態同期を行うことで、`FR-008` および `SC-003`（解消済みエラーの残留 0件）を確実に達成できるため。

### Alternatives Considered（検討した代替案）
- **`undoChanges` ハンドラ内でのみ強制的に `saveStatus = 'saved'` へ戻す案**: 複数環境に同時にエラーがある状態で1環境だけ Undo した場合に、他環境のエラーが残っているにもかかわらず誤って保存完了表示になってしまう不具合や、手動入力で元の値に戻した場合にエラーが残る問題を防げないため却下。
