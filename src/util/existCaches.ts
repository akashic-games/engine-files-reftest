import * as fs from "fs";
import * as path from "path";
import type { NormalizedReftestConfigure } from "../configure/ReftestConfigure";

// 指定したテストタイプのキャッシュが存在するか判定する関数
// 存在する場合には、 configure の値をそのパスへ破壊的に変更する
export function existCaches(
	configure: NormalizedReftestConfigure, targetTestTypes: Readonly<"sandbox" | "serve" | "export-zip" | "export-html" | "android">[]
): boolean {
	// TODO: キャッシュ周りを抜本的に見直す。少なくとも以下の点を改める:
	//  - 名前に反して破壊的に値を書き換えている
	//  - キャッシュが必要ないはずの状況 (--sandbox-path などが既に与えられている場合) でも上書きしている
	//  - バージョンのミスマッチを考慮していない
	//  - バージョン指定 (--sandbox-ver など) を無視している

	let binSrc: string;
	const npmCacheDir = configure.npmCacheDir;
	for (const testType of targetTestTypes) {
		switch (testType) {
			// 指定するテストタイプに必要なバイナリキャッシュが存在するか
			case "sandbox":
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-sandbox");
				if (!fs.existsSync(binSrc)) {
					// 旧バージョン向けフォールバック。本当はバージョンによってキャッシュは一意に定まるはずだが、
					// 現在の実装はバージョンを考慮できていないので、ここでは単に「あれば使う」。(この関数上部のコメントも参照)
					binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-sandbox");
					if (!fs.existsSync(binSrc)) {
						return false;
					}
				}
				break;
			case "serve":
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				break;
			case "export-zip":
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-export-zip");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				break;
			case "export-html":
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-export-html");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				if (!fs.existsSync(binSrc)) {
					return false;
				}
				break;
			case "android":
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
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
			case "sandbox":
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-sandbox");
				if (!fs.existsSync(binSrc)) {
					// 旧バージョン向けフォールバック。本当はバージョンによってキャッシュは一意に定まるはずだが、
					// 現在の実装はバージョンを考慮できていないので、ここでは単に「あれば使う」。(この関数上部のコメントも参照)
					binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-sandbox");
				}
				configure.sandboxPath = binSrc;
				break;
			case "serve":
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				configure.servePath = binSrc;
				break;
			case "export-zip":
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-export-zip");
				configure.exportZipPath = binSrc;
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				configure.servePath = binSrc;
				break;
			case "export-html":
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-export-html");
				configure.exportHtmlPath = binSrc;
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				configure.servePath = binSrc;
				break;
			case "android":
				binSrc = path.resolve(npmCacheDir, "node_modules", ".bin", "akashic-cli-serve");
				configure.servePath = binSrc;
				break;
			default:
				return false;
		}
	}
	return true;
}
