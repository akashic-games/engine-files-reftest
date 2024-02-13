// reftestの実行モード
// test: コンテンツ実行時のスクリーンショット画像と正解画像の比較テスト
// update-expected: 正解画像の更新
// update-expected-only-diff: 正解画像の更新（テストタイプ・テスト設定・シナリオ・コンテンツについて、前回の更新から差分がある可能性がある場合のみ）
export type ReftestMode = "test" | "update-expected" | "update-expected-only-diff";
