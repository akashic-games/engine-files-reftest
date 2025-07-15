import * as fs from "fs";
import * as pngjs from "pngjs";
import type { FileDiff } from "./FileDiff";

// @types/pixelmatchを利用するためにはesModuleInteropを有効にする必要があるが、その場合他箇所のビルドにも影響が出るためrequireを使用
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pixelmatch = require("pixelmatch");

interface VerifyImageParameterObject {
	// 正解画像のパス
	expectedPath: string;
	// 検証対象画像のパス
	targetPath: string;
}

// 正解画像と検証対象画像を比較して、diff割合やdiff画像情報を返す
export function verifyImage(param: VerifyImageParameterObject): FileDiff {
	const expected = pngjs.PNG.sync.read(fs.readFileSync(param.expectedPath));
	const actual = pngjs.PNG.sync.read(fs.readFileSync(param.targetPath));
	const {width, height} = expected;
	const diff = new pngjs.PNG({width, height});
	// thresholdはピクセルごとの差異の閾値を表している
	const value = pixelmatch(expected.data, actual.data, diff.data, width, height, {threshold: 0.1});
	const difference = value / (width * height);
	console.log(`diff: ${100 * difference}%`);
	const content = pngjs.PNG.sync.write(diff);
	return { ...param, difference, content };
}
