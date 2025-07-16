import * as fs from "fs";
import { execCommand } from "./execCommand";
// npm install するディレクトリを初期化する関数
export function initializeNpmDir(npmCacheDir: string): void {
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
