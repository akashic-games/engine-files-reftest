import * as fs from "fs";
import * as path from "path";
import type { ReftestConfigure } from "../configure/ReftestConfigure";

// 指定したテストタイプのキャッシュが存在するか判定する関数
// 存在する場合には、 configure の値をそのパスへ破壊的に変更する
export function existCaches(
	configure: ReftestConfigure, targetTestTypes: Readonly<"sandbox" | "serve" | "export-zip" | "export-html" | "android">[]
): boolean {
	let binSrc: string;
	for (const testType of targetTestTypes) {
		switch (testType) {
			// 指定するテストタイプに必要なバイナリキャッシュが存在するか
			case "sandbox":
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-sandbox");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				break;
			case "serve":
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				break;
			case "export-zip":
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-export-zip");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				break;
			case "export-html":
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-export-html");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				break;
			case "android":
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				break;
			default:
				return false;
		}
	}

	// 全て存在することが確定した場合 configure の各バイナリ指定パスを書き換える
	for (const testType of targetTestTypes) {
		switch (testType) {
			// 指定するテストタイプに必要なバイナリキャッシュが存在するか
			case "sandbox":
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-sandbox");
				configure.sandboxPath = binSrc;
				break;
			case "serve":
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				configure.servePath = binSrc;
				break;
			case "export-zip":
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-export-zip");
				configure.exportZipPath = binSrc;
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				configure.servePath = binSrc;
				break;
			case "export-html":
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-export-html");
				configure.exportHtmlPath = binSrc;
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				configure.servePath = binSrc;
				break;
			case "android":
				binSrc = path.resolve(configure.npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				configure.servePath = binSrc;
				break;
			default:
				return false;
		}
	}
	return true;
}
