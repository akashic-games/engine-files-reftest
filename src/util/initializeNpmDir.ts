import * as fs from "fs";
import type { NormalizedReftestConfigure } from "../configure/ReftestConfigure";
import { execCommand } from "./execCommand";
// キャッシュディレクトリを初期化する関数
export function initializeNpmDir(configure: NormalizedReftestConfigure): void {
	const npmCacheDir = configure.npmCacheDir;
	if (fs.existsSync(npmCacheDir))fs.rmdirSync(npmCacheDir, { recursive: true });
	console.log("Binary cache has been cleared");
	fs.mkdirSync(npmCacheDir, { recursive: true });
	const cwd = process.cwd();
	try {
		process.chdir(npmCacheDir);
		execCommand("npm init -y");
	} finally {
		process.chdir(cwd);
	}
}
