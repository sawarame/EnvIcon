# クイックスタート・検証ガイド (Quickstart & Validation): ポート番号・URLパス対応の環境マッチング

**対象機能**: [spec.md](./spec.md) (`001-port-path-matching`)
**関連契約**: [url-pattern-matching.md](./contracts/url-pattern-matching.md) / [messaging-and-storage.md](./contracts/messaging-and-storage.md)
**データモデル**: [data-model.md](./data-model.md)

---

## 1. 前提条件とセットアップ

### 必要環境
- Node.js（LTS 推奨）および npm
- Google Chrome ブラウザ（Manifest V3 対応版）

### ビルドおよび型検証コマンド
リポジトリルートで以下のコマンドを実行し、TypeScript の厳格型チェック・Webpack バンドル・配布用アーカイブ生成がエラーなく完了することを確認する。

```bash
npm install
npm run build
```

**期待される結果**:
- 終了コード `0` で完了すること。
- `package/js/` 配下に `background.js`, `content.js`, `options.js`, `popup.js` が出力され、ルート直下に `package.zip` が生成されること。

### Chrome への拡張機能読み込み
1. Chrome で `chrome://extensions/` を開く。
2. 右上の「デベロッパーモード」を有効にする。
3. 「パッケージ化されていない拡張機能を読み込む」をクリックし、リポジトリ内の `package/` ディレクトリを選択する（既に読み込み済みの場合は更新ボタンを押下する）。

---

## 2. エンドツーエンド検証シナリオ

### シナリオ 1: ポート番号別の環境識別とポップアップ操作（User Story 1 & 3）
1. ローカルで2つの簡易HTTPサーバーを起動する（例: 別ターミナルで `npx serve -l 3000` と `npx serve -l 8080`、または `python3 -m http.server 3000` と `python3 -m http.server 8080`）。
2. `http://localhost:3000` を開き、ツールバーの EnvIcon アイコンをクリックしてポップアップを開く。
   - **確認**: 現在のサイト欄に `localhost:3000` と表示されること。
3. ポップアップ上で `DEV` をクリックして割り当てる。
   - **確認**: リロードなしで `http://localhost:3000` の Favicon・ページ右下バッジ・ツールバーアイコンが `DEV`（緑）になり、`http://localhost:8080` 側は未適用のままであること。
4. `http://localhost:3000` のポップアップで「このサイトを一時OFF」を ON にし、別途 `http://localhost:8080` を `STG` に割り当てる。
   - **確認**: `localhost:3000` のみがミュート状態（`OFF` アイコン＋元 Favicon 復元）になり、`localhost:8080` の `STG` 表示は維持されること。

---

### シナリオ 2: パス境界一致・正規化・優先順位・URLチェッカー（User Story 1 & 2）
1. オプション設定画面（`options.html`）を開く。
2. 各環境に以下のパターンを入力し、500ms 後に自動保存（「すべての変更を自動保存しました」）になることを確認する：
   - `Production`: `example.com`
   - `Staging`: `https://Example.COM/stg/?preview=1#top`
   - `Development`: `example.com/stg/Admin`
3. オプション画面上部の「URLチェッカー」を開き、以下の検証用URLを順に入力する（詳細な変換・優先度規則は [url-pattern-matching.md](./contracts/url-pattern-matching.md) を参照）：
   - `https://example.com/about` → **期待結果**: `Production` に一致し、`Production` の `example.com` 行のみが緑色ハイライトされる。
   - `https://example.com/staging` → **期待結果**: `Production` に一致する（`Staging` の `/stg` にはセグメント境界不一致のため誤マッチしない）。
   - `https://example.com/stg/users` → **期待結果**: 詳細度ルールにより `Production` より具体的な `Staging` に一致し、`Staging` のパターン行のみが緑色ハイライトされる（`Production` の `example.com` 行はハイライトされない）。
   - `https://example.com/stg/Admin/panel` → **期待結果**: より深いパスを持つ `Development` に一致し、`Development` の行のみが緑色ハイライトされる。
   - `https://example.com/stg/admin/panel` → **期待結果**: パスの大文字・小文字区別により `Development` には一致せず、1つ上の階層である `Staging` に一致する。

---

### シナリオ 3: 正規表現の後方互換とポート・パス正規表現（User Story 2）
1. オプション設定画面で `Development` に正規表現（`Regex` ON）として `^.*\.local$` を追加し、URLチェッカーに `http://myapp.local/dashboard` を入力する。
   - **確認**: パスが含まれていても後方互換ルールにより `Development` に一致すること。
2. 別の正規表現（`Regex` ON）として `^localhost:300[0-9]/admin` を追加し、URLチェッカーに `http://localhost:3005/admin/users` と `http://localhost:3005/home` を入力する。
   - **確認**: 前者は一致し、後者は不一致となること。

---

### シナリオ 4: ポップアップの誤編集防止ロック（User Story 3）
1. パス指定ルール（例: `github.com/my-org`）または正規表現ルールで一致する実ページを開き、ポップアップを表示する。
   - **確認**: 環境割り当てボタン一覧の代わりにロック案内ボックスと一致パターン文字列が表示され、誤って削除・上書きできないこと（「このサイトを一時OFF」スイッチは動作すること）。
2. 設定画面でポートなしの `localhost` を登録した状態で `http://localhost:3000` を開き、ポップアップを表示する。
   - **確認**: 親ホストルール（`localhost`）による一致としてロック案内が表示されること。

---

### シナリオ 5: SPA 画面内遷移へのリアルタイム追従とコンソール出力制御（User Story 4）
1. SPA 構成のサイト（例: GitHub やローカルの Vue/React アプリ）で特定のサブパス（例: `github.com/<owner>/<repo>/pulls`）のみを `Staging` に登録し、DevTools の Console タブを開く。
2. トップまたは対象外パス（例: `github.com/<owner>/<repo>`）を開いた状態から、ページ内リンクをクリックして登録済みパス（`/pulls`）へリロードなしで遷移する。
   - **確認**: 1秒以内に Favicon・ページ内バッジ・ツールバーアイコンが `STG` に切り替わり、コンソールに `[EnvIcon] Current Env: Staging` が1回出力されること。
3. 同じ `/pulls` 配下の別ページへさらに画面内遷移する。
   - **確認**: バッジ表示は維持されたまま、コンソールに同じ環境ログが重複出力されないこと。
4. ブラウザの「戻る」ボタン等で対象外パスへ戻る。
   - **確認**: リロードなしでサイト本来の Favicon へ復元され、ページ内バッジとツールバーバッジが消去されること。

---

### シナリオ 6: バリデーション・テーマ・言語の回帰確認
1. 設定画面で不正なポート（`example.com:99999`, `example.com:abc`）や、表記揺れの重複（`example.com/stg` と `https://EXAMPLE.com/stg/`）を入力する。
   - **確認**: 該当入力欄が赤枠（`.p-invalid`）になり、フッターに未保存の警告が表示されること。
2. ライトモード / ダークモード、および 日本語 / 英語 を切り替える。
   - **確認**: オプション画面とポップアップ画面の双方で、新規追加・変更されたロック案内やプレースホルダー文言を含めて表示崩れや未翻訳キーがないこと。
