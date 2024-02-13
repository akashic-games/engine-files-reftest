import * as path from "path";

// 引数のファイルパスリストの共通ディレクトリパスを取得する
export function resolveRootDirPath(filePaths: string[]): string {
	let rootDir = "";
	if (filePaths.length === 0) {
		throw new Error("Can't resolve root directory path. Please specify file paths.");
	}
	const pathStrings = filePaths.map(p => p.split(/[\\/]/));
	const pathDepth = pathStrings[0].length;
	for (let i = 0; i < pathDepth; i++) {
		const target = pathStrings[0][i];
		if (pathStrings.some(strs => i >= strs.length || strs[i] !== target)) {
			break;
		} else {
			rootDir += target + "/";
		}
	}
	return path.resolve(rootDir);
}
