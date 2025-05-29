import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as cpx from "cpx";
import * as ejs from "ejs";
import * as sharp from "sharp";
import type { ReftestResult } from "../types/ReftestResult";
import { mkdirpSync } from "../util/mkdirpSync";

// TODO: renderHtmlReportに引数として渡すべきものを考え直す必要がある(特にcontentDirPath)。
interface RenderContentResultParameterObject {
	reftestResult: ReftestResult;
	testType: string;
	contentDirPath: string;
	threshold: number;
	outputDir: string;
	versionInfo: string;
	timeoutImagePath?: string;
}

interface ResultForRender {
	expectedImage: string;
	outputImage: string;
	diffImage: string;
	diffRate: number;
}

export async function renderHtmlReport(param: RenderContentResultParameterObject): Promise<void> {
	const contentDirPath = path.resolve(param.outputDir, param.contentDirPath, param.testType);
	mkdirpSync(contentDirPath);
	const expectedDirPath = path.join(contentDirPath, "expected");
	mkdirpSync(expectedDirPath);
	const outputDirPath = path.join(contentDirPath, "output");
	mkdirpSync(outputDirPath);
	const diffDirPath = path.join(contentDirPath, "diff");
	mkdirpSync(diffDirPath);

	let timeoutImagePath = "";
	if (param.timeoutImagePath) {
		const timeoutPath = path.join(contentDirPath, "timeout");
		mkdirpSync(timeoutPath);
		cpx.copySync(param.timeoutImagePath, timeoutPath);
		timeoutImagePath = `./timeout/${path.basename(param.timeoutImagePath)}` ;
	}

	const results: ResultForRender[] = [];
	for (const fileDiff of param.reftestResult.fileDiffs) {
		const expectedImagePath = await compressImage(fileDiff.expectedPath, expectedDirPath);
		const outputImagePath = await compressImage(fileDiff.targetPath, outputDirPath);
		const diffImagePath = path.join(diffDirPath, path.basename(fileDiff.expectedPath));
		fs.writeFileSync(diffImagePath, fileDiff.content);
		results.push({
			expectedImage: path.relative(contentDirPath, expectedImagePath),
			outputImage: path.relative(contentDirPath, outputImagePath),
			diffImage: path.relative(contentDirPath, diffImagePath),
			diffRate: parseFloat(fileDiff.difference.toFixed(5))
		});
	}
	const templatePath = path.resolve(__dirname, "../../templates/contentResult.ejs");
	const content = fs.readFileSync(templatePath, "utf8");
	const rendered = ejs.render(
		content,
		{
			results,
			testType: param.testType,
			contentDirPath: param.contentDirPath,
			threshold: param.threshold,
			versionInfo: param.versionInfo,
			timeoutImage: timeoutImagePath
		},
		{ filename: templatePath }
	);
	fs.writeFileSync(path.join(contentDirPath, "index.html"), rendered);
}

async function compressImage(srcPath: string, distDirPath: string): Promise<string> {
	const distPath = path.join(distDirPath, path.basename(srcPath));
	// 画像のアスペクト比はニコ生環境に合わせて16:9とする
	// TODO: 出力画像のサイズは将来的には入力パラメータ等で指定できるようにすべき
	await sharp(srcPath).resize(400, 225, {fit: "inside"}).png({
		quality: 50
	}).toFile(distPath);
	return distPath;
}
