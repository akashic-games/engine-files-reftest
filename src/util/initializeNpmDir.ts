import { execSync } from "child_process";
import * as fs from "fs";
import type { NormalizedReftestConfigure } from "../configure/ReftestConfigure";
// キャッシュディレクトリを初期化する関数
export function initializeNpmDir(configure: NormalizedReftestConfigure): void {
	const npmCacheDir = configure.npmCacheDir;
	if (fs.existsSync(npmCacheDir))fs.rmdirSync(npmCacheDir, { recursive: true });
	console.log("Binary cache has been cleared");
	fs.mkdirSync(npmCacheDir, { recursive: true });
	const cwd = process.cwd();
	try {
		process.chdir(npmCacheDir);
		execSync("npm init -y");
	} finally {
		process.chdir(cwd);
	}
}
