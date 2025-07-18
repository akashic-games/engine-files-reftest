import * as fs from "fs";
import { execCommand } from "./execCommand";
// npm install するディレクトリを初期化する関数
export function initializeNpmDir(installDir: string): void {
	if (fs.existsSync(installDir)) fs.rmdirSync(installDir, { recursive: true });
	console.log("Binary cache has been cleared");
	fs.mkdirSync(installDir, { recursive: true });
	const cwd = process.cwd();
	try {
		process.chdir(installDir);
		execCommand("npm init -y");
	} finally {
		process.chdir(cwd);
	}
}
