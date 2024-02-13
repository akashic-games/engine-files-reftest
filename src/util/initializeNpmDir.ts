import { execSync } from "child_process";
import * as fs from "fs";
import type { ReftestConfigure } from "../configure/ReftestConfigure";
// キャッシュディレクトリを初期化する関数
export function initializeNpmDir(configure: ReftestConfigure): void {
	if (fs.existsSync(configure.npmCacheDir))fs.rmdirSync(configure.npmCacheDir, { recursive: true });
	console.log("Binary cache has been cleared");
	fs.mkdirSync(configure.npmCacheDir, { recursive: true });
	const cwd = process.cwd();
	try {
		process.chdir(configure.npmCacheDir);
		execSync("npm init -y");
	} finally {
		process.chdir(cwd);
	}
}
