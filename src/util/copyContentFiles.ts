import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { AudioAssetConfigurationBase } from "@akashic/game-configuration";
import { extractAssetPaths } from "@akashic/game-configuration/lib/utils/extractAssetPaths";
import * as cpx from "cpx";
import * as glob from "glob";
import { mkdirpSync } from "./mkdirpSync";

// 指定したコンテンツで使われているファイルを別ディレクトリにコピーし、コピー先のディレクトリパスを返す
export function copyContentFiles(contentDir: string): string {
	const contentDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "reftest-tmp-content"));
	const gameJsonPath = path.resolve(contentDir, "game.json");
	cpx.copySync(gameJsonPath, contentDirPath);
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const gameConfiguration = require(gameJsonPath);
	const audioExtensionResolver = (asset: AudioAssetConfigurationBase): string[] => {
		if (asset.hint?.extensions) {
			return asset.hint.extensions;
		} else {
			// 後方互換性のために実在するファイルの拡張子を全て取得
			// globはwindows環境のdelimiterに対応できないので、windows環境のdelimiterがあればlinux環境のものに変換する必要がある。
			return glob.sync(path.resolve(contentDir, asset.path + ".*").replace(/\\/g, "/")).map(f => path.extname(f));
		}
	};
	extractAssetPaths({ gameConfiguration, audioExtensionResolver }).forEach(p => {
		const dir = path.resolve(contentDirPath, path.dirname(p));
		mkdirpSync(dir);
		cpx.copySync(path.resolve(contentDir, p), dir);
	});
	return contentDirPath;
}

