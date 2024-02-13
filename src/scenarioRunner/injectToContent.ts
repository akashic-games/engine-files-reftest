import * as fs from "fs";
import * as path from "path";
import { bundle } from "../util/bundle";

// bundle処理を最低限の回数で済ませるためにreftest-helperをbundleした結果をバージョン毎に保持するもの。reftest実行中にreftest-helperの内容は変わらないので過去のbundle結果を使い回せる。
const bundledReftestHelperSrcMap: { [moduleName: string]: string } = {};

// 指定されたコンテンツにreftest-helperを追加する関数
export async function injectReftestHelper(dirPath: string): Promise<void> {
	// reftest-helperをコンテンツ側に差し込むための処理
	// game.jsonの動的読み込みのため、require の lint エラーを抑止
	/* eslint-disable @typescript-eslint/no-var-requires */
	const originalGameJson = require(path.resolve(dirPath, "game.json"));
	let reftestHelper = "reftest-helper";
	if (!originalGameJson.environment
		|| !originalGameJson.environment["sandbox-runtime"]
		|| originalGameJson.environment["sandbox-runtime"] === "1"
	) {
		reftestHelper = "reftest-helper-for-ae1x";
	}
	if (!bundledReftestHelperSrcMap[reftestHelper]) {
		bundledReftestHelperSrcMap[reftestHelper] = await bundle(require.resolve(reftestHelper), ["g"]);
	}
	injectScriptToEntryPoint(dirPath, bundledReftestHelperSrcMap[reftestHelper]);
}

// 指定されたコンテンツに指定されたスクリプトファイルの内容を差し込む処理
export function injectScripts(dirPath: string, scriptPaths: string[]): void {
	if (scriptPaths.length === 0) {
		return;
	}
	injectScriptToEntryPoint(dirPath, scriptPaths.map(p => fs.readFileSync(path.resolve(p)).toString()).join("\n"));
}

function injectScriptToEntryPoint(dirPath: string, script: string): void {
	// scriptをエントリポイントに差し込む処理
	// game.jsonの動的読み込みのため、require の lint エラーを抑止
	/* eslint-disable @typescript-eslint/no-var-requires */
	const gameJson = require(path.resolve(dirPath, "game.json"));
	// mainかmainSceneのアセットが無ければそもそもコンテンツは動かないので、どちらかは必ず存在すると想定する
	const mainScriptPath = gameJson.main ?? gameJson.assets.mainScene.path;
	const mainScriptSrc = fs.readFileSync(path.resolve(dirPath, mainScriptPath)).toString();
	fs.writeFileSync(path.resolve(dirPath, mainScriptPath), `${script}\n${mainScriptSrc}`);
}
