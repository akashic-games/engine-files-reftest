# CHANGELOG

## 3.4.1-beta.3
* `@akashic/engine-files-reftest-helper` を更新

## 3.4.1-beta.2
* デバッグ用に差し込むスクリプトを出力するように

## 3.4.1-beta.1
* `@akashic/engine-files-reftest-helper` を更新

## 3.4.1-beta.0
* `@akashic/engine-files-reftest-helper` を更新

## 3.4.0

* `test-type` に "serve-standalone" と "sandbox-classic" を追加
  * "serve-standalone" では `akashic serve --standalone` を実行するように
  * "sandbox-classic" では　`akashic sandbox` を実行するように
* `test-type: sandbox` を `test-type: serve-standalone` のエイリアスに変更

## 3.3.33

* 変更内容なし (npm publish のテスト実行のためバージョン更新)

## 3.3.32

* 変更内容なし (npm publish のテスト実行のためバージョン更新)

## 3.3.31

* 変更内容なし (npm publish のテスト実行のためバージョン更新)

## 3.3.30

* Android モード実行時の内部処理を修正

## 3.3.29

* akashic serve 環境で、passive モードのコンテンツのスクリーンショット画像の撮影領域がずれている問題の修正
* reftest実行エラー時にスクリーンショットを撮るように
  * `--error-screenshot-dir-path` オプションでエラー時のスクリーンショット画像を保存するディレクトリを指定できるように

## 3.3.28

* akashic sandbox 環境で、passiveモードのv3コンテンツが動作しなくなる不具合の修正

## 3.3.27

* Android モードで DOM 要素の表示を待機するように

## 3.3.26

* `--output-html` オプションでの出力画像調整

## 3.3.25

* 一部環境でエラー内容が Buffer で表示されてしまう問題を修正

## 3.3.24

* strict化対応
* --npm-cache-dir-pathのデフォルトパスを `__bincache` に変更

## 3.3.23

* akashic-cli 統合後のバージョンの sandbox が扱えない問題を修正

## 3.3.22

* --serve-ver, --sandbox-ver オプションの追加

## 3.3.21

* reftest 終了時にプロセスを明示的に終わらせるように

## 3.3.20

* 初期リリース

## 3.3.19

* android モードのパラメータをオプションで設定できるように変更

## 3.3.18

* --npm-cache-dir-pathオプションが反映されるように修正

## 3.3.17

* コンテンツ、reftest.entry.json、シナリオ、の変更に応じた差分のみを更新するオプションを追加

## 3.3.16

* 正解画像ディレクトリの削除時に、正解画像ディレクトリが存在するかチェックするように

## 3.3.15

* npm ファイルのキャッシュ保存機能およびキャッシュを使用するオプションの追加

## 3.3.14

* 正解画像更新時、正解画像ディレクトリがすでに存在する場合それを削除するように修正

## 3.3.13

* テスト結果 HTML の画像を縮小・圧縮

## 3.3.12

* ScenarioRunner のループ回数を reftest.entry.json で指定できるように変更

## 3.3.11

* 出力ファイル・正解ファイル比較時、双方向の比較に対応

## 3.3.10

* ログ出力形式の調整

## 3.3.9

* playlog のファイル名が衝突するリスクのある問題の解決

## 3.3.8

* コンテンツ実行時間の上限を5分に変更

## 3.3.7

* tmpディレクトリ作成時に不要なファイルをコピーしないように

## 3.3.6

* Audio のテストを再び利用できるように
* `ReftestEntry#enableAudio` を追加。この値が true の時だけ Audio のテストを行う

## 3.3.5

* テスト結果の HTML に、作成日とツールのバージョン情報を表示するように

## 3.3.4

* Audio のテストを一時的に無効化

## 3.3.3

* ツール化に伴い CHANGELOG 追加
* 音声取得時、初期化待ちのため serve をポーズ状態で開始するように

