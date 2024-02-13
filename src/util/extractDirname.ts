import * as path from "path";

/**
 * 対象のパスから最後のディレクトリ名を取得
 * @param targetPath
 */
export function extractDirname(targetPath: string): string {
	const dirs = path.dirname(targetPath).split(path.sep);
	return dirs[dirs.length -1];
}
