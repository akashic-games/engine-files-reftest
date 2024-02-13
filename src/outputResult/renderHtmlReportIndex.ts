import * as fs from "fs";
import * as path from "path";
import * as ejs from "ejs";
import type { ReftestResult } from "../types/ReftestResult";

interface RenderContentResultListParameterObject {
	reftestResultMap: {[testType: string]: {[contentDirPath: string]: ReftestResult}};
	outputDir: string;
}

// reftestOutputDiffMapには1つ以上testTypeキーがある且つ「あるtestTypeキーにはあるコンテンツの結果があるが別のtestTypeキーには無い」というパターンは無いという前提で処理を行う
export function renderHtmlReportIndex(param: RenderContentResultListParameterObject): void {
	const templatePath = path.resolve(__dirname, "../../templates/contentResultList.ejs");
	const content = fs.readFileSync(templatePath, "utf8");
	const rendered = ejs.render(
		content,
		{ title: "reftest実行結果一覧", reftestResultMap: param.reftestResultMap },
		{ filename: templatePath }
	);
	fs.writeFileSync(path.resolve(param.outputDir, "index.html"), rendered);
}
