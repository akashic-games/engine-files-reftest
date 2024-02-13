// 2つのファイルを比較した結果
export interface FileDiff {
	difference: number; // diffの割合(値は0以上1未満)
	content: Buffer; // diffデータ
	targetPath: string; // 比較対象ファイルのパス
	expectedPath: string; // 正解ファイルのパス
}
