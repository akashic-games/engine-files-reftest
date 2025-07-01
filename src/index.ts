import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Command } from "commander";
import * as glob from "glob";
import { AUDIO_IMAGE_FILE_NAME, THRESHOLD_FOR_AUDIO_IMAGE } from "./audioExtractor/AudioExtractor";
import type { ReftestCommandOption, TestType} from "./configure/ReftestConfigure";
import { createReftestConfigure, resolveTestTypes, TEST_TYPES, DEFAULT_IMAGE_DIFF_THRESHOLD } from "./configure/ReftestConfigure";
import type { NormalizedReftestEntry, ReftestEntry } from "./configure/ReftestEntry";
import { normalizeReftestEntry } from "./configure/ReftestEntry";
import { renderHtmlReport } from "./outputResult/renderHtmlReport";
import { renderHtmlReportIndex } from "./outputResult/renderHtmlReportIndex";
import { withRunnerUnit } from "./RunnerUnit";
import type { ReftestMode } from "./types/ReftestMode";
import type { ReftestResult } from "./types/ReftestResult";
import type { Screenshot } from "./types/Screenshot";
import { createConfigureHash } from "./util/createConfigureHash";
import { diffDirectory } from "./util/diffDirectory";
import { existCaches } from "./util/existCaches";
import type { FileDiff } from "./util/FileDiff";
import { initializeNpmDir } from "./util/initializeNpmDir";
import { mkdirpSync } from "./util/mkdirpSync";
import { resolveRootDirPath } from "./util/resolveRootDirPath";

const ver = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8")).version;

const commander = new Command();
commander.version(ver);

commander
	.description("Run reftest for specified contents")
	.option("-c, --configure <path>", "File path of reftest-configure")
	.option("--target <paths...>", "File paths of test-target")
	.option("--test-type <type>", `Following test type. ${TEST_TYPES.join(", ")}, or all. default: all`)
	.option("--update", "Update expected images instead of test")
	.option("--update-diff", "Update expected images if any cofigure's difference exists")
	.option("--diff-dir-path <path>", "Path of directory saved error diff image.")
	.option("--error-diff-dir-path <path>", "Path of directory saved error diff image.")
	.option("--threshold <theshold>", `Threshold of diff image. value range: 0 ~ 1. default: ${DEFAULT_IMAGE_DIFF_THRESHOLD}`)
	.option("--sandbox-ver <version>", "Version of akashic-(cli-)sandbox")
	.option("--serve-ver <version>", "Version of akashic-cli-serve")
	.option("--sandbox-path <path>", "Path of akashic-(cli-)sandbox")
	.option("--serve-path <path>", "Path of akashic-cli-serve")
	.option("--export-html-path <path>", "Path of akashic-cli-export-html")
	.option("--export-zip-path <path>", "Path of akashic-cli-export-zip")
	.option("--android-apk-path <path>", "Path of test apk file")
	.option("--android-playlog-client-path <path>", "Path of playlog-client")
	.option("--android-emulator <name>", "Name of android emulator")
	.option("--android-app-package <name>", "Identifier of android app-package")
	.option("--android-app-activity <name>", "Name of android app-activity")
	.option("--output-html <path>", "Output result of reftest as html file")
	.option("--timeout-error-dir-path <path>", "Path to output screenshot at timeout")
	.option("--use-npm-cache", "Use cache npm binaries")
	.option("--npm-cache-dir-path <path>",
		"Path to save npm. If not specified default path is './.npmcache' or if configurePath is specified 'CONFIGURE_PATH/../.npmcache'"
	);

void (async () => {
	try {
		commander.parse(process.argv);
		const configure = createReftestConfigure(commander.opts<ReftestCommandOption>());

		if (!configure.targets || configure.targets.length === 0) {
			throw new Error("Please specify --target <paths...>.");
		}
		const reftestEntries: NormalizedReftestEntry[] = configure.targets.flatMap(pattern => {
			// globはwindows環境のdelimiterに対応できないので、windows環境のdelimiterがあればlinux環境のものに変換する必要がある。
			return glob.sync(pattern.replace(/\\/g, "/")).map(p => {
				// テスト内容の動的読み込みのため、require の lint エラーを抑止
				/* eslint-disable @typescript-eslint/no-require-imports */
				const reftestEntry = require(path.resolve(p)) as ReftestEntry;
				return normalizeReftestEntry(reftestEntry, path.resolve(p));
			});
		});
		const reftestEntryRootDirPath = resolveRootDirPath(reftestEntries.map(e => e.selfPath));
		const targetTestTypes = resolveTestTypes(configure.testType);
		const mode: ReftestMode = configure.update ? "update-expected" : (configure.updateDiff ? "update-expected-only-diff" : "test");
		const diffDirBasePath: string | null = configure.diffDirPath ? path.resolve(configure.diffDirPath) : null;
		const errorDiffDirBasePath: string | null = configure.errorDiffDirPath ? path.resolve(configure.errorDiffDirPath) : null;
		const timeoutErrorDirPath: string | null =  configure.timeoutErrorDirPath ? path.resolve(configure.timeoutErrorDirPath) : null;
		const imageDiffThreshold = configure.threshold;
		const reftestResultMap: { [testType in TestType]: { [contentName: string]: ReftestResult }; } = Object.create(null);
		let htmlReportDir: string | null = null;
		if (configure.outputHtml) {
			htmlReportDir = path.resolve(configure.outputHtml);
			mkdirpSync(htmlReportDir);
		}
		// バイナリのキャッシュを使用しない、または、使用するキャッシュが存在しない場合、キャッシュを初期化
		if (!configure.useNpmCache || !existCaches(configure, targetTestTypes)) {
			initializeNpmDir(configure);
		}

		for (const testType of targetTestTypes) {
			reftestResultMap[testType] = Object.create(null);
			await withRunnerUnit<void>({testType, configure}, async (runnerUnit) => {
				for (const reftestEntry of reftestEntries) {
					const configureHash = createConfigureHash(reftestEntry);
					const configureHashPath = path.resolve(reftestEntry.expectedDirPath, "__hash__");
					const lastConfigureHashPath = path.resolve(configureHashPath, `${testType}.hash.txt`);
					console.log(`start a runnerUnit (testType : ${testType})`);
					if (mode === "update-expected-only-diff") {
						// 設定に変更があるかどうか調べ、なければ continue する
						if (fs.existsSync(lastConfigureHashPath) && fs.readFileSync(lastConfigureHashPath, "utf8") === configureHash) {
							console.log(`skip a runnerUnit (testType : ${testType}) because there're no configure differences.`);
							continue;
						}
					}
					const output = await runnerUnit.run(reftestEntry);
					const expectedDir = path.resolve(reftestEntry.expectedDirPath, testType);
					console.log(`finish a runnerUnit (testType : ${testType})`);
					if (mode === "update-expected" || mode === "update-expected-only-diff") {
						if (output.status === "timeout") throw new Error("Timeout Error");
						if (fs.existsSync(expectedDir)) {
							fs.rmdirSync(expectedDir, { recursive: true }); // 前回のテスト結果が残っていたら消す
						}
						outputScreenshots(output.screenshots, expectedDir);
						// lastConfigureHashPath に現在実行した設定のハッシュ値を保存しておく
						if (!fs.existsSync(lastConfigureHashPath)) {
							fs.mkdirSync(configureHashPath, { recursive: true });
						}
						fs.writeFile(lastConfigureHashPath, configureHash, "utf8",
							(err) => {
								if (err) {
									console.error("failed to save hashed last configure file.", err);
								} else {
									console.log("succeeded to save hashed last configure file.");
								}
							});
					} else {
						const reftestEntryPath = path.relative(reftestEntryRootDirPath, reftestEntry.selfPath);
						const outputDir = path.join(os.tmpdir(), reftestEntryPath, testType, Date.now().toString());
						let diffs: FileDiff[] = [];
						let errors: FileDiff[] = [];
						let timeoutImagePath = "";
						if (output.status !== "timeout") {
							outputScreenshots(output.screenshots, outputDir);
							diffs = output.status === "skipped-unsupported" ? [] : diffDirectory(expectedDir, outputDir);
							errors = diffs.filter(d => {
								// 音声の出力タイミングを制御できない且つ毎回音量等にブレが生じるため、音声の波形画像については他のスクリーンショットとは別の閾値を設ける
								if (path.basename(d.targetPath) === AUDIO_IMAGE_FILE_NAME) {
									return d.difference > THRESHOLD_FOR_AUDIO_IMAGE;
								} else {
									return d.difference > imageDiffThreshold;
								}
							});
							if (diffDirBasePath) {
								outputDiffImages(diffs, path.join(diffDirBasePath, reftestEntryPath, testType));
							}
							if (errorDiffDirBasePath) {
								outputDiffImages(errors, path.join(errorDiffDirBasePath, reftestEntryPath, testType));
							}
						} else {
							if (timeoutErrorDirPath && output.timeoutImage) {
								output.timeoutImage.fileName = `${testType}_${output.timeoutImage.fileName}`;
								outputScreenshots([output.timeoutImage], timeoutErrorDirPath);
								timeoutImagePath = path.join(timeoutErrorDirPath, output.timeoutImage.fileName);
							}
						}

						reftestResultMap[testType][reftestEntryPath] = {
							fileDiffs: diffs,
							status: (output.status === "skipped-unsupported") ? "skipped" :
									(output.status === "timeout") ? "timeout" :
									(errors.length === 0 ? "succeeded" : "failed")
						};
						if (output.status !== "skipped-unsupported" && htmlReportDir) {
							await renderHtmlReport({
								reftestResult: reftestResultMap[testType][reftestEntryPath],
								testType,
								// TODO: これは出力画像の保存先ディレクトリパスで、reftestEntry.contentDirPathとは意味が異なるので、プロパティ名を修正する必要がある
								contentDirPath: reftestEntryPath,
								threshold: imageDiffThreshold,
								outputDir: htmlReportDir,
								versionInfo: runnerUnit.getVersionInfo(),
								timeoutImagePath
							});
						}

						if (fs.existsSync(outputDir))
							fs.rmdirSync(outputDir, { recursive: true }); // TODO: tmpファイルを削除するオプションを用意して、そのオプションが指定された時のみ削除するように
					}
				}
			});
		}
		// 正解画像更新のみであればテスト結果の出力・検証をする必要はないのでここで処理を終了する。
		if (mode === "update-expected" || mode === "update-expected-only-diff") {
			return;
		}

		if (htmlReportDir) {
			renderHtmlReportIndex({ reftestResultMap, outputDir: htmlReportDir });
		}

		const thresholdErrors: string[] = [];
		const timeoutErrors: string[] = [];
		targetTestTypes.flatMap((type: TestType) => {
			Object.keys(reftestResultMap[type]).map(name => {
				const status = reftestResultMap[type][name].status;
				const contentName = [`${name}(${type})`].join(",");
				if (status === "failed") {
					thresholdErrors.push(contentName);
				} else if (status === "timeout") {
					timeoutErrors.push(contentName);
				}
			});
		});

		if (timeoutErrors.length > 0) {
			throw new Error(`Timeout on "${timeoutErrors.join(",")}"`
				+ (timeoutErrorDirPath !== null ?
					` please see ${timeoutErrorDirPath} to confirm detail.` :
					" please specify --timeout-error-dir-path <path> to confirm detail."));
		}

		if (thresholdErrors.length > 0) {
			throw new Error(`invalid images on "${thresholdErrors.join(", ")}"`
				+ ` (greater than threshold(${100 * imageDiffThreshold}%)).`
				+ (errorDiffDirBasePath !== null ?
					` please see ${errorDiffDirBasePath} to confirm detail.` :
					" please specify --error-diff-dir-path <path> to confirm detail."));
		}
	} catch (e) {
		console.error(e);
		process.exit(1);
	} finally {
		console.log("Completed Reftest");
		// 環境によってはreftestのプロセスが終了しないことがあるので、明示的に終了させる
		process.exit(0);
	}
})();

function outputScreenshots(screenshots: Screenshot[], outputDir: string): void {
	mkdirpSync(outputDir);
	for (const screenshot of screenshots) {
		console.log(`save ${screenshot.fileName}`);
		fs.writeFileSync(path.join(outputDir, screenshot.fileName), Buffer.from(screenshot.base64, "base64"));
	}
}

function outputDiffImages(fileDiffs: FileDiff[], outputDir: string): void {
	mkdirpSync(outputDir);
	fileDiffs.forEach(diff => {
		fs.writeFileSync(path.join(outputDir, path.basename(diff.targetPath)), diff.content);
	});
}
