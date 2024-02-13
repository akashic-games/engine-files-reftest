import * as fs from "fs";
import * as path from "path";
import type { FileDiff } from "./FileDiff";
import { verifyImage } from "./verifyImage";

export function diffDirectory(expectedDirPath: string, targetDirPath: string): FileDiff[] {
	const fileDiffs: FileDiff[] = [];
	console.log(`start to check difference between ${expectedDirPath} and ${targetDirPath}.`);

	const expectedFiles = fs.readdirSync(expectedDirPath);
	const targetFiles = fs.readdirSync(targetDirPath);
	const [shortageFiles, excessFiles] = diffStringsEachOther(expectedFiles, targetFiles);
	if (shortageFiles.length > 0 || excessFiles.length > 0) {
		throw new Error(
			"expected file set are not same as output file set\n" +
			` - unmatched expected files : ${shortageFiles}\n` +
			` - unmatched output files : ${excessFiles}`
		);
	}

	for (const fileName of expectedFiles) {
		console.log(`validate ${fileName}`);
		const fileDiff = verifyImage({
			expectedPath: path.join(expectedDirPath, fileName),
			targetPath: path.join(targetDirPath, fileName)
		});
		fileDiffs.push(fileDiff);
	}
	console.log(`finish to check difference between ${expectedDirPath} and ${targetDirPath}.`);
	return fileDiffs;
}

// 文字列配列 A と B に対して、 A \ B と B \ A のペアを計算する関数（ includes を用いると要素数が増えたときに計算量が N^2 になるため N log N に削減した ）
function diffStringsEachOther(stringsA: string[], stringsB: string[]): [string[], string[]] {
	const aMinusB: string[] = [];
	const bMinusA: string[] = [];
	stringsA = stringsA.concat().sort();
	stringsB = stringsB.concat().sort();
	for (let i = 0, j = 0; i < stringsA.length || j < stringsB.length;){
		if (i === stringsA.length) {
			bMinusA.push(stringsB[j]);
			j++;
			continue;
		}
		if (j === stringsB.length) {
			aMinusB.push(stringsA[i]);
			i++;
			continue;
		}
		const a = stringsA[i], b = stringsB[j];
		if (a < b) {
			aMinusB.push(a);
			i++;
		} else if (a > b) {
			bMinusA.push(b);
			j++;
		} else {
			i++;
			j++;
		}
	}
	return [aMinusB, bMinusA];
}
