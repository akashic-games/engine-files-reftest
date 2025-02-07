# engine-files-reftest

<p align="center">
<img src="https://github.com/akashic-games/engine-files-reftest/blob/main/img/akashic.png"/>
</p>

Akashic関連ツールの動作確認を行うツールです。

与えられたシナリオでコンテンツを実行し、スクリーンショットなどの形で結果を取得、事前に作成した正解データとの一致をテストします。
現在のところ akashic-cli-serve, akashic-sandbox, akashic-cli-export-html, akashic-cli-export-zip をサポートしています。

## 用語

* ターゲットバイナリ/target binary：テスト対象のプログラム。serve, export html など。
* ターゲットコンテンツ/target content: テスト対象のコンテンツ。これを実行してスクショを撮る。
* シナリオ/scenario: target content に流し込む playlog。コンテンツに対する操作や、スクショの取得タイミング情報を持っている。
* シナリオランナー/scenario runner: target content と scenario を受け取り、実行してスクショを得るコード。target binary によって実装が異なる。
* プリプロセッサ/preprocessor: ターゲットコンテンツをシナリオランナーに与える前に変形するプログラム。

## インストール

```
npm install -g @akashic/engine-files-reftest
```

## 利用方法

以下のようにコマンドを実行します。

```bash
engine-files-reftest -c <path> [--options]
```

`-c`(正式名は `--configure`) オプションでreftest実行に関する諸々のオプションを指定を行っている設定ファイルのパスを指定します。
`-c` オプションも他のオプションと同様に省略可能ですが、省略した場合コマンド実行場所に `reftest.config.json`という名前で設定ファイルを配置しておく必要があります。
`-c` オプション以外のオプションを設定ファイルで指定することができます。オプションをコマンド実行時と設定ファイルの両方で指定した場合、コマンド実行時に指定した値が優先されます。

### オプション一覧

|引数名|必須|内容|デフォルト値|
|:---:|:---:|:---:|:---:|
|--configure(-c) <path>||`ReftestConfigure`の形式で書かれた設定ファイルのパスを指定。詳細は「設定ファイルの書き方」で後述。|`./reftest.config.json`|
|--target <paths...>|※1|`ReftestEntry`の形式で書かれたテスト対象ファイルのパスを指定。複数パスやglob形式での指定が可能。詳細は「テスト対象ファイルの書き方」で後述。| |
|--test-type <type>||どのプリプロセッサーとシナリオランナーで実行するかを指定。詳細は「`--test-type`の種類」で後述。|"all"|
|--update| |trueの場合テストを行わずに正解データの更新を行う。falseの場合テストを実行。|false|
|--update-diff| |--updateがtrueであれば無効。そうでないときtrueの場合テストを行わずに正解データの更新を行うが、設定に変化がないため更新を行う必要のないものをスキップする。falseの場合テストを実行|false|
|--diff-dir-path <path>| |正解画像と出力画像の間の差分画像を出力するディレクトリのパスを指定。| |
|--error-diff-dir-path <path>| |正解画像と出力画像の間に大きな差分が発生した時の差分画像を出力するディレクトリのパスを指定。| |
|--threshold <theshold>| |正解画像と出力画像の間でどの程度まで差分を許すか0~1の割合で定義。|0(0%)|
|--sandbox-ver <version>| |akashic-sandboxのバージョンを指定。指定しなかった場合は最新のakashic-sandboxをインストールして利用する。--sandbox-path 指定時は無効となる。| |
|--serve-ver <version>| |akashic-cli-serveのバージョンを指定。指定しなかった場合は最新のakashic-cli-serveをインストールして利用する。--serve-path 指定時は無効となる。| |
|--sandbox-path <path>| |akashic-sandboxのパスを指定。このオプションを指定した場合はそのパスを利用する。指定しなかった場合は最新のakashic-sandboxをインストールして利用する。| |
|--serve-path <path>| |akashic-cli-serveのパスを指定。このオプションを指定した場合はそのパスを利用する。指定しなかった場合は最新のakashic-cli-serveをインストールして利用する。| |
|--export-html-path <path>| |akashic-cli-export-htmlのパスを指定。このオプションを指定した場合はそのパスを利用する。指定しなかった場合は最新のakashic-cli-exportをインストールして利用する。| |
|--export-zip-path <path>| |akashic-cli-export-zipのパスを指定。このオプションを指定した場合はそのパスを利用する。指定しなかった場合は最新のakashic-cli-exportをインストールして利用する。| |
|--android-apk-path <path>|`--test-type android` 時のみ〇|androidアプリのapkパスを指定。`--test-type android` 以外の時このオプションは利用されない。| |
|--android-playlog-client-path <path>|`--test-type android` 時のみ〇|akashic-cli-serveで利用するplaylog-clientのパスを指定。`--test-type android` 以外の時このオプションは利用されない。| |
|--android-emulator <name>||androidアプリを動かすエミュレータを指定する。`--test-type android` 以外の時このオプションは利用されない。|`emulator -list-avds`実行時に先頭に表示されるエミュレータ|
|--output-html <path>| |指定されたディレクトリ下にhtml形式でテスト結果を出力する。詳細は「`--output-html`オプション使用時の成果物」で後述。||
|--timeout-error-dir-path <path>| |指定されたディレクトリ下にタイムアウト時のスクリーンショットを出力する。||
|--use-npm-cache| |reftest 実行に必要とする npm モジュールはキャッシュされたものを使用する。||
|--npm-cache-dir-path <path>| |npm モジュールのキャッシュを保存する、またはキャッシュを参照するディレクトリを指定する。デフォルトでは reftest.configure.json/../.npmcache または ./.npmcache||
※1: 設定ファイルかコマンド実行時のどちらかで必ず指定する必要があります。設定ファイルで指定されていればコマンド実行時に指定する必要はありません。

### 設定ファイルの書き方

[`ReftestConfigure`](./src/configure/ReftestConfigure.ts)をjsonもしくはjavascript形式のファイルとして記述します。
以下記述例。
```javascript
{
  "testType": "serve", // --test-type
  "targets": [
    // --target
    "./**/configure.json"
  ],
  "update": false, // --update
  "sandboxVer": "x.x.x" // --sandbox-ver
  "serveVer": "x.x.x" // --serve-ver
  "sandboxPath": "/path/to/sandbox", // --sandbox-path
  "servePath": "/path/to/serve", // --serve-path
  "exportHtmlPath": "/path/to/export-html", // --export-html-path
  "exportZipPath": "/path/to/export-zip", // --export-zip-path
  "diffDirPath": "/path/to/diff", // --diff-dir-path
  "errorDiffDirPath": "/path/to/error-diff", // --error-diff-dir-path
  "threshold": 0.03, // --theshold
  "android": {
    "apkPath": "/path/to/apk", // --android-apk-path
    "playlogClientPath": "/path/to/playlog-client-path", // --android-playlog-client-path
    "emulator": "XXX" // --android-emulator
  },
  "outputHtml": "public" // --output-html
}
```

### テスト対象ファイルの書き方

[`ReftestEntry`](./src/configure/ReftestEntry.ts)をjsonもしくはjavascript形式のファイルとして記述します。
以下記述例。
```javascript
{
  "contentDirPath": ".", // ターゲットコンテンツのgame.jsonがあるパスを指定。指定されなかった場合、テスト対象ファイルのディレクトリのパスが与えられる(設定ファイルとgame.jsonは同ディレクトリにあるという前提なので)。
  "scenario": {
    "type": "playlog", // シナリオの種類を指定。現在はplaylogしかないので実質playlog一択。
    "path": "./playlog.json" // シナリオのパスを指定
  },
  "executionMode": "passive", // コンテンツの実行方法を指定。指定できる値はreplayかpassive。
  "expectedDirPath": "./expected" // 正解画像の格納先ディレクトリのパスを指定。実際はこのディレクトリ下のtestType名のディレクトリ下に格納される。
  "injectFilePath": "./inject.js" // オプション項目。コンテンツのエントリポイントの先頭に差し込むスクリプトが書かれたファイルパスを文字列か文字列配列の形式で指定
}
```

### シナリオ作成方法

* akashic-cli-serveまたはakashic-sandboxで出力されるplaylogファイルを利用することができます。
* ただし、reftestでスクリーンショットを取得する,コンテンツを終了するといった動作は、[`ReftestMessageEvent`](./src/types/scenario.ts)で定義されている型でplaylogファイルに直接追記する必要があります。

### `--test-type`の種類

|type名|シナリオランナー|プリプロセッサー|
|:---:|:---:|:---:|
|sandbox|akashic-sandbox|なし|
|serve|akashic-cli-serve|なし|
|export-zip|akashic-cli-serve|akashic-cli-zip|
|export-html|http-server|akashic-cli-html|
|android|(非公開の Android アプリ)|なし|
|all|上記の全typeのテストを実行||
|all-pc|android以外の全typeのテストを実行||

### `--output-html`オプション使用時の成果物

`--output-html <path>` オプションを指定すると、`<path>`ディレクトリ下に以下のようなファイルが出力される。
* `<path>`
  * {content\_name}
    * {test\_type}
      * index.html: {test_type}で{content_name}の実行結果詳細を表形式で表示
      * expected: 正解画像配置用ディレクトリ
      * output: 出力画像配置用ディレクトリ
      * diff: 正解画像と出力画像の差分画像配置用ディレクトリ
  * index.html: コンテンツ毎の各環境での実行結果を表形式で表示。各セルをクリックすることで実行結果詳細ページへ飛ぶことが可能

## androidアプリ上でのテスト

### 環境の構築手順
非公開の Android アプリ上でのテストを行うために、テスト実行元で以下のような環境構築が必要になります。

1. JDKインストール
2. JDKのディレクトリへのパスを環境変数 `JAVA_HOME` として定義
3. PATHにJDKへのパス(`$JAVA_HOME/bin`)追加
4. Android Studio インストール
5. Android Studio を用いてAndroid Virtual Device(AVD)を作成
   * デバイス：androidの検証のために使うため Phone カテゴリから任意のデバイスを選択することを推奨
   * OS：最新のものに合わせることを推奨(2022年2月時点では Android 12 が最新)
6. Android SDK のディレクトリへのパスを環境変数 `ANDROID_HOME` として定義
   * Android Studio の Settings画面のAppearance & Behavior > System Settings > Android SDK で Android SDK のパスを確認可能
7. PATHにadb(`$ANDROID_HOME/platform-tools`)とemulator(`$ANDROID_HOME/emulator`)へのパスを追加

## 本リポジトリのディレクトリ構成
* src
  * index.ts: エントリーポイント
  * ReftestOutput.ts: reftest実行時に得られる成果物(スクリーンショット等)に関する処理(取得・ファイル出力・検証)を行う
  * RunnerUnit.ts: シナリオランナーとプリプロセッサをまとめて1つの単位として管理
  * configure: 設定ファイルや起動時オプション
  * outputResult: 検証結果の出力に関するものを配置
  * preprocessor: プリプロセッサ。プリプロセッサに関する処理で共通部分があればそれも配置
  * scenarioRunner: シナリオランナー。シナリオランナーに関する処理で共通部分があればそれも配置
  * targetBinary: ターゲットバイナリ。ターゲットバイナリに関する処理で共通部分があればそれも配置
  * types: interfaceやtypeのみを定義したファイルを配置
  * util: 各所で共通で使いそうな処理が定義されたものを配置

## ライセンス
本リポジトリは MIT License の元で公開されています。
詳しくは [LICENSE](https://github.com/akashic-games/engine-files-reftest/blob/main/LICENSE) をご覧ください。

ただし、画像ファイルおよび音声ファイルは
[CC BY 2.1 JP](https://creativecommons.org/licenses/by/2.1/jp/) の元で公開されています。
