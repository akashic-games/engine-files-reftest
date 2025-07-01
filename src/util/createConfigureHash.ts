import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

import type { AudioAssetConfigurationBase } from "@akashic/game-configuration";
import { extractAssetPaths } from "@akashic/game-configuration/lib/utils/extractAssetPaths";
import * as glob from "glob";
import type { NormalizedReftestEntry } from "../configure/ReftestEntry";

// テストの設定を保存するためのハッシュを生成
export function createConfigureHash(reftestEntry: NormalizedReftestEntry): string {
	const sha256hash = crypto.createHash("sha256");
	// reftest.entry.json の追加
	const reftestEntryFile = fs.readFileSync(reftestEntry.selfPath);
	sha256hash.update(reftestEntryFile);
	// playlog.json の追加
	const scenarioFile = fs.readFileSync(reftestEntry.scenario.path);
	sha256hash.update(scenarioFile);
	// game.json の追加
	const gameJsonPath = path.resolve(reftestEntry.contentDirPath, "game.json");
	const gameJsonFile = fs.readFileSync(gameJsonPath);
	sha256hash.update(gameJsonFile);
	// game.json 以下のディレクトリ全ての追加
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const gameConfiguration = require(gameJsonPath);
	const audioExtensionResolver = (asset: AudioAssetConfigurationBase): string[] => {
		if (asset.hint?.extensions) {
			return asset.hint.extensions;
		} else {
			// 後方互換性のために実在するファイルの拡張子を全て取得
			// globはwindows環境のdelimiterに対応できないので、windows環境のdelimiterがあればlinux環境のものに変換する必要がある。
			return glob.sync(path.resolve(reftestEntry.contentDirPath, asset.path + ".*").replace(/\\/g, "/")).map(f => path.extname(f));
		}
	};
	extractAssetPaths({ gameConfiguration, audioExtensionResolver }).sort().forEach(p => {
		const contentFile = fs.readFileSync(path.resolve(reftestEntry.contentDirPath, p));
		sha256hash.update(contentFile);
	});
	const configureHash = sha256hash.digest("hex");
	return configureHash;
}
