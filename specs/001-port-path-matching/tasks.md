---

description: "ポート番号・URLパス対応の環境マッチング機能の実装タスクリスト"
---

# Tasks: ポート番号・URLパス対応の環境マッチング

**Input**: Design documents from `/specs/001-port-path-matching/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: 本機能の仕様書では新規テストフレームワークの導入は要求されておらず、プロジェクト憲章に従い TypeScript 厳格型検査・本番バンドル検証（`npm run build`）および [quickstart.md](./quickstart.md) の実機検証シナリオによって品質を担保する。

**Organization**: 各ユーザーストーリーを独立して実装・動作検証できるよう、ストーリー単位（US1〜US4）でフェーズを分割している。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（編集対象ファイルが異なり、同一フェーズ内の未完了タスクに依存しない）
- **[Story]**: 対応するユーザーストーリー識別子（`[US1]`, `[US2]`, `[US3]`, `[US4]`）
- すべてのタスクに正確なプロジェクト相対ファイルパスを含める

## Path Conventions

- **実装ディレクトリ**: `src/`（`src/features/`, `src/options/`, `src/popup/`）
- **配布パッケージ定義**: `package/`（※`package/js/` および `package.zip` はビルド生成物のため直接編集禁止）
- **設計・仕様ドキュメント**: `DESIGN.md`, `AGENTS.md`, `specs/001-port-path-matching/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 全画面・全ストーリーで共有する多言語辞書キーの準備

- [X] T001 `src/options/i18n.ts` にポート・パス対応の入力プレースホルダー（`placeholderHostname` 等）、URLパターン検証エラー文言、およびポップアップの汎用パターンロック案内文言を英語（`en`）・日本語（`ja`）の双方で追加・更新する

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのユーザーストーリーが共通依存する型定義と対象URLロケーション解析基盤の構築

**⚠️ CRITICAL**: このフェーズが完了するまで、以降のユーザーストーリー実装を開始してはならない

- [X] T002 `src/types.ts` にランタイム評価モデル（`ParsedUrlPattern`、`TargetLocation`、`MatchSpecificity`）、拡張版 `EnvMatchDetail`（`envIndex: number`、`patternIndex: number`、`isExactHostPortMatch: boolean` を追加）、および `TabUrlChangedMessage`（`{ type: "URL_CHANGED"; url: string }`）を含むメッセージ型を日本語 JSDoc 付きで定義する
- [X] T003 `src/features/utils.ts` に検査対象URLから `TargetLocation`（小文字 `hostname`、非標準 `port`、`http:` は `"80"`・`https:` は `"443"` とする `effectivePort`、小文字 `hostWithPort`、ケース維持 `pathname`、`hostAndPath`）を抽出する `parseTargetLocation` 関数（`http:` / `https:` 以外のスキームおよび Chrome ウェブストア制限ページは `null` を返す）と、`SessionData.disabledHostnames` に対して `hostWithPort` 単位で判定する `isTemporarilyDisabled` 関数を実装する

**Checkpoint**: 共有型とロケーション抽出基盤が完成し、各ユーザーストーリーの実装に着手可能な状態

---

## Phase 3: User Story 1 - ポート番号およびパスを含むURLパターンの設定と環境識別 (Priority: P1) 🎯 MVP

**Goal**: オプション設定画面の既存1行入力欄で `ホスト名[:ポート番号][/パス]` を入力・正規化・検証して保存でき、アクセス先URLのポート番号やパス境界に応じて Favicon・ページ内バッジ・ツールバーアイコン・コンソール出力が正しく適用されるようにする。

**Independent Test**: オプション設定画面で `localhost:3000`（DEV）、`localhost:8080`（STG）、`example.com/stg`（STG）、`example.com/Admin`（STG）を登録し、フルURL貼り付け時の正規化保存と、該当URLおよび非該当の類似URL（`example.com/staging`、`example.com/admin`）でのバッジ表示有無を単独検証できる。

### Implementation for User Story 1

- [X] T004 [US1] `src/features/utils.ts` に通常パターン文字列の構造化解析・正規化関数 `parseUrlPattern` を実装する（データモデル制約: 前後空白除去、プロトコル指定時は `http://` または `https://` 以外を無効エラー、クエリ `?...` とハッシュ `#...` を切り捨て、`hostname` は小文字化と有効ドメイン/`localhost`/IPv4/IPv6構文検証、`port` 指定時は `1〜65535` の整数検証ならびに `http://` での `:80`・`https://` での `:443` の標準ポート省略正規化、`path` は大文字・小文字を保持したまま末尾 `/` をすべて除去し `/` のみは空文字 `""` として `hostname[:port][/path]` を生成）
- [X] T005 [US1] `src/features/utils.ts` の `isPatternMatch`、`findMatchingDetail`、`findMatchingEnv` を更新し、通常パターンにおいて（1）小文字 `hostname` 一致、（2）ポート未指定または `port`/`effectivePort` 一致、（3）パス未指定または大文字・小文字を区別したスラッシュ境界での配下一致（`targetNormalizedPath === pattern.path` または `targetNormalizedPath.startsWith(pattern.path + "/")`）の3条件で判定するよう実装する
- [X] T006 [P] [US1] `src/options/utils.ts` の入力検証ヘルパーを更新して `src/features/utils.ts` の `parseUrlPattern` と連携させ、ホスト名単体だけでなくポート番号・パスを含むURL文字列の検証と正規化値取得を行えるようにする
- [X] T007 [US1] `src/options/App.vue` の `executeSave` 処理を更新し、通常パターンを正規化後の `hostname[:port][/path]` に変換して保存するとともに、一意性キー `pattern:${normalizedValue}`（正規表現は `regex:${value.trim()}`）による環境横断の重複エラー検知と、`any` 型を使わない型安全なバリデーション状態管理を実装する
- [X] T008 [P] [US1] `src/features/favicon_changer.ts` の環境マッチングおよび一時OFF判定の呼び出しを `window.location.hostname` から `window.location.href` ベースの評価へ更新する
- [X] T009 [P] [US1] `src/features/page_badge_changer.ts` の環境マッチングおよび一時OFF判定の呼び出しを `window.location.hostname` から `window.location.href` ベースの評価へ更新する
- [X] T010 [P] [US1] `src/features/console_logger.ts` の環境マッチングおよび一時OFF判定の呼び出しを `window.location.hostname` から `window.location.href` ベースの評価へ更新する
- [X] T011 [P] [US1] `src/background.ts` の `updateActionBadge` を更新し、`tab.url` から抽出した `TargetLocation` を用いてフルURLベースの環境判定および `hostWithPort` 単位の一時OFFアイコン描画を行うようにする

**Checkpoint**: User Story 1（MVP）が単独で動作し、ポート別・パス別の環境設定と4種すべての環境インジケーター表示が機能する状態

---

## Phase 4: User Story 2 - 詳細度に基づく優先判定と正規表現の後方互換マッチ (Priority: P2)

**Goal**: 広域ルールと具体的なパス・ポートルールが同時一致した際に詳細度の高いパターンを自動優先し、既存のホスト名向け正規表現の後方互換とポート・パス正規表現を両立させ、URLチェッカーで実際に採用された1行のみをハイライト表示する。

**Independent Test**: リスト上位の `PROD` に `example.com`、下位の `DEV` に `example.com/dev`、さらに正規表現 `^.*\.local$` を登録し、URLチェッカーおよび実ページで `https://example.com/dev/page` や `http://myapp.local/dashboard` を検証した際の優先選択結果と「採用された1行のみの緑色ハイライト」を確認できる。

### Implementation for User Story 2

- [X] T012 [US2] `src/features/utils.ts` の正規表現マッチング処理を更新し、`new RegExp(pattern.value.trim())` を `target.hostAndPath`（ルート `/` 時は `target.hostWithPort` 単体も含む）に対してテストするとともに、パターン文字列に `:` と `/` のいずれも含まれない場合に限り `target.hostname` 単体に対しても後方互換テストを行うよう実装する
- [X] T013 [US2] `src/features/utils.ts` の `findMatchingDetail` に `MatchSpecificity` の7段階優先度比較アルゴリズム（1: `tier` 降順 `[3: パスあり > 2: ポートあり > 1: ホストのみ]`、2: `isExactRule` 降順 `[1: 通常 > 0: 正規表現]`、3: `pathSegmentCount` 降順、4: `pathLength` 降順、5: `hasPort` 降順 `[1 > 0]`、6: `envIndex` 昇順、7: `patternIndex` 昇順）を実装し、最優先の1件に `envIndex` と `patternIndex` を含めて返すようにする
- [X] T014 [P] [US2] `src/options/components/HostnameList.vue` を更新し、コンポーネント内の独自 `isMatch` 判定と `checkerHostname` prop を廃止して、親から受け取る `matchedPatternIndex: number | null` に一致するインデックスの1行のみに `.match-success` クラスを付与するよう変更する（あわせてテンプレート内の `any` キャストを除去する）
- [X] T015 [US2] `src/options/components/EnvSection.vue` と `src/options/App.vue` の URL チェッカー処理を更新し、`checkerUrl` の判定に `src/features/utils.ts` の `findMatchingDetail` を共通利用して、採用された環境の `EnvSection` にのみ `matchedPatternIndex`（他環境には `null`）を渡すよう統合する

**Checkpoint**: User Story 1 と User Story 2 が統合動作し、親子パターンの優先度解決・正規表現の後方互換・URLチェッカーの単一行ハイライトがすべて正確に機能する状態

---

## Phase 5: User Story 3 - クイック操作ポップアップでのポート単位操作と誤編集防止ロック (Priority: P2)

**Goal**: クイック操作ポップアップの表示・ワンクリック環境割り当て・解除・サイト単位一時OFFを `ホスト名[:ポート番号]` 単位で動作させ、パス指定・正規表現・ポートなし親ルールによる一致時はロック案内を表示して設定の誤破壊を防止する。

**Independent Test**: `http://localhost:3000/app` でポップアップから環境割り当ておよび一時OFFを実行して `http://localhost:8080/app` に影響しないこと、ならびにパス指定ルールや親ホストルールで一致中のページでロック案内が表示されることを確認できる。

### Implementation for User Story 3

- [X] T016 [US3] `src/features/utils.ts` の `findMatchingDetail` において、一致したパターンが通常モード（`!isRegex`）かつ正規化済みパターン値が `target.hostWithPort` と完全一致する場合のみ `isExactHostPortMatch: true`（パス指定・正規表現・ポートなし親ホスト一致時は `false`）を設定するロジックを実装・検証する
- [X] T017 [US3] `src/popup/PopupApp.vue` を更新し、アクティブタブURLから抽出した `hostWithPort`（例: `localhost:3000` または `example.com`）を表示・ワンクリック環境割り当て・解除・`disabledHostnames` 一時OFFの単位に変更するとともに、`matchDetail !== null && !matchDetail.isExactHostPortMatch` の場合に一致パターン文字列と設定画面誘導ボタンを含むロック案内ボックスを表示する

**Checkpoint**: ポップアップからのポート別ワンクリック操作と、パス・正規表現・親ホストルールに対する誤編集防止ロックが完全に機能する状態

---

## Phase 6: User Story 4 - ページ再読み込みを伴わない画面内遷移へのリアルタイム追従 (Priority: P3)

**Goal**: SPA 等でページ再読み込みを伴わずにURLパスが切り替わった際、1秒以内に Favicon・ページ内バッジ・ツールバーアイコンを更新・復元し、コンソールログは判定環境が変化したときのみ出力する。

**Independent Test**: SPA サイト上で対象外パスから登録済みパス（例: `/stg/list`）への画面内遷移、同一環境内パス（`/stg/detail`）への遷移、および対象外パスへの復帰を行い、リロードなしでのバッジ適用・完全復元とコンソール重複出力の抑止を確認できる。

### Implementation for User Story 4

- [X] T018 [P] [US4] `src/background.ts` の `chrome.tabs.onUpdated` リスナーを更新し、`changeInfo.url` が存在する際に対象タブへ `{ type: "URL_CHANGED", url: changeInfo.url }` メッセージを `chrome.tabs.sendMessage` で送信（コンテンツスクリプト未注入タブでのエラーは安全に無視）する処理を追加する
- [X] T019 [P] [US4] `src/features/url_observer.ts` を新規作成し、`chrome.runtime.onMessage`（`URL_CHANGED`）および `window` の `popstate` イベントを購読して、直前に評価した `hostWithPort + pathname` から変化があった場合のみ通知コールバックを発火する `initializeUrlObserverFeature` 関数を実装する（クエリやハッシュのみの変化は無視する）
- [X] T020 [P] [US4] `src/features/console_logger.ts` に前回出力した環境識別子を保持する状態管理（`_lastLoggedEnvId: string | null`）と `refreshConsoleLoggerFeature` 関数を追加し、初期読み込み時および判定結果の環境IDが変化したときのみコンソール出力を行い（未一致・一時OFF時は `null` へリセット）、同一環境内のパス遷移では重複出力しないよう実装する
- [X] T021 [US4] `src/content.ts` を更新し、`initializeUrlObserverFeature` を初期化時に登録して、画面内URLパス変化時および `chrome.storage.onChanged` 発火時に Favicon・ページ内バッジ・コンソールログの各 `refresh*` 関数を一括呼び出しするオーケストレーション処理を接続する

**Checkpoint**: 全ユーザーストーリー（US1〜US4）が独立かつ統合された状態で機能する完成状態

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 設計ドキュメント同期、コーディング規約（憲章）コンプライアンス点検、および最終ビルド・E2E検証

- [X] T022 [P] `DESIGN.md`（セクション 4.2 / 4.3 のポップアップ `ホスト[:ポート]` 表示およびパターン一致ロック表示仕様）および `AGENTS.md`（`src/features/url_observer.ts` のモジュール記載）を実装内容と同期更新する
- [X] T023 [P] 変更・追加した全ソースファイル（`src/types.ts`, `src/background.ts`, `src/content.ts`, `src/features/*.ts`, `src/options/**`, `src/popup/PopupApp.vue`）を点検し、`any` 型の不使用、未待機 Promise への `void` 明示、および全関数・メソッドへの日本語 JSDoc（概要・`@param`・`@returns`）と日本語インラインコメントの記載を確認する
- [X] T024 `npm run build` を実行して `package/js/` バンドルおよび `package.zip` が型エラー・ビルドエラーなしで生成されることを確認し、`specs/001-port-path-matching/quickstart.md` の全検証シナリオ（シナリオ1〜6）を実施する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即座に開始可能
- **Foundational (Phase 2)**: Phase 1 と並行または直後に実行可能 — **すべての User Story フェーズをブロックする必須前提**
- **User Stories (Phase 3〜Phase 6)**: Phase 2 完了後に開始
  - **User Story 1 (Phase 3 - P1)**: Phase 2 完了後すぐに開始可能（他ストーリーへの依存なし）
  - **User Story 2 (Phase 4 - P2)**: `src/features/utils.ts` の基本通常パターン判定（US1 の T004・T005）をベースに優先度比較・正規表現拡張を行うため、US1 の T005 完了後の着手を推奨（UI側の T014 は Phase 2 完了後いつでも先行並列実行可能）
  - **User Story 3 (Phase 5 - P2)**: US1 の T005（または US2 の T013）完了後に T016・T017 を実行可能（US4 とは完全に独立）
  - **User Story 4 (Phase 6 - P3)**: US1 の各 feature 基本更新（T008〜T011）完了後に開始可能（US2・US3 とは独立して並列進行可能）
- **Polish (Phase 7)**: 全 User Story（Phase 3〜Phase 6）完了後に実行

### User Story Dependency Graph

```text
Phase 1 (Setup: T001) & Phase 2 (Foundational: T002 -> T003)
                         │
                         ▼
         Phase 3: User Story 1 (P1 🎯 MVP: T004 -> T005 -> T006..T011)
            ├───> Phase 4: User Story 2 (P2: T012 -> T013 -> T015, [P] T014)
            │        └───> Phase 5: User Story 3 (P2: T016 -> T017)
            └───> Phase 6: User Story 4 (P3: [P] T018, [P] T019, [P] T020 -> T021)
                         │
                         ▼
         Phase 7: Polish & Validation ([P] T022, [P] T023 -> T024)
```

### Parallel Opportunities

- **User Story 1 内**: `T005`（`src/features/utils.ts` の基本判定）が完了した時点で、`T006`（`src/options/utils.ts`）、`T008`（`src/features/favicon_changer.ts`）、`T009`（`src/features/page_badge_changer.ts`）、`T010`（`src/features/console_logger.ts`）、`T011`（`src/background.ts`）の **5タスクを同時並列実行可能**。
- **User Story 2 内**: `T014`（`src/options/components/HostnameList.vue`）は `T012`・`T013`（`src/features/utils.ts`）と編集ファイルが異なるため並列実行可能。
- **User Story 4 内**: `T018`（`src/background.ts`）、`T019`（`src/features/url_observer.ts`）、`T020`（`src/features/console_logger.ts`）の **3タスクを同時並列実行可能**。
- **Polish フェーズ内**: `T022`（ドキュメント更新）と `T023`（JSDoc・型安全点検）を並列実行可能。

---

## Parallel Example: User Story 1 & User Story 4

```bash
# User Story 1 で T005 完了後に並列実行可能なタスク群:
Task T006: "src/options/utils.ts の入力検証ヘルパー更新"
Task T008: "src/features/favicon_changer.ts の href ベース評価対応"
Task T009: "src/features/page_badge_changer.ts の href ベース評価対応"
Task T010: "src/features/console_logger.ts の href ベース評価対応"
Task T011: "src/background.ts の TargetLocation アイコン描画対応"

# User Story 4 で並列実行可能なタスク群:
Task T018: "src/background.ts の URL_CHANGED メッセージ送信追加"
Task T019: "src/features/url_observer.ts の新規作成"
Task T020: "src/features/console_logger.ts の重複出力防止と refresh 関数追加"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1（`T001`）および Phase 2（`T002`〜`T003`）を完了して型定義とロケーション解析基盤を固める。
2. Phase 3: User Story 1（`T004`〜`T011`）を完了する。
3. **STOP and VALIDATE**: `npm run build` を通し、`localhost:3000` / `localhost:8080` や `example.com/stg` の登録・識別が単独で動作することを検証する（MVP 達成）。

### Incremental Delivery

1. **Foundation**（Phase 1〜2） → 共通基盤完成
2. **+ User Story 1**（Phase 3） → ポート・パス指定の設定保存と基本バッジ表示が稼働（MVP）
3. **+ User Story 2**（Phase 4） → 親子ルールの詳細度優先解決・正規表現の後方互換・URLチェッカー単一行ハイライトが完成
4. **+ User Story 3**（Phase 5） → ポップアップでの `ホスト[:ポート]` 操作と誤編集防止ロックが完成
5. **+ User Story 4**（Phase 6） → SPA 画面内遷移へのリアルタイム追従とコンソール重複出力防止が完成
6. **+ Polish**（Phase 7） → `DESIGN.md` / `AGENTS.md` 同期・JSDoc/型検査・全シナリオ検証完了

---

## Notes

- `[P]` 付きタスクは異なるファイルを対象としており、未完了タスクへのデータ競合がないことを検証済み。
- 自動生成ディレクトリ（`package/js/`、`package/icons/*.png`、`package.zip`）は直接編集せず、必ず `T024` の `npm run build` で生成する。
- すべての新規・変更関数には日本語の JSDoc（概要・`@param`・`@returns`）を記述し、`any` 型を使用しないこと。
