// ローカルファイルを使う場合
export type TargetBinarySourceLocal = {
	type: "local";
	path: string;
};

// publish されたものを使う場合
export type TargetBinarySourcePublished = {
	type: "published";
	downloadDirPath: string;
	version?: string;
};

export type TargetBinarySource = TargetBinarySourceLocal | TargetBinarySourcePublished;
