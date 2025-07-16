import * as fs from "fs";
import * as path from "path";
import type { AudioExtractor } from "./audioExtractor/AudioExtractor";
import { createServeAudioExtractor } from "./audioExtractor/createServeAudioExtractor";
import type { NormalizedReftestConfigure, TestType } from "./configure/ReftestConfigure";
import type { NormalizedReftestEntry } from "./configure/ReftestEntry";
import { createExportHtmlPreprocessor } from "./preprocessor/createExportHtmlPreprocessor";
import { createExportZipPreprocessor } from "./preprocessor/createExportZipPreprocessor";
import type { Preprocessor } from "./preprocessor/Preprocessor";
import { createAndroidScenarioRunner } from "./scenarioRunner/android/createAndroidScenarioRunner";
import { injectReftestHelper, injectScripts } from "./scenarioRunner/injectToContent";
import type { ReftestOutput, ScenarioRunner } from "./scenarioRunner/ScenarioRunner";
import { createServeScenarioRunner } from "./scenarioRunner/serve/createServeScenarioRunner";
import { createAkashicSandbox } from "./scenarioRunner/staticHost/AkashicSandbox";
import { createStaticHostScenarioRunner } from "./scenarioRunner/staticHost/createStaticHostScenarioRunner";
import { StaticHttpServe } from "./scenarioRunner/staticHost/StaticHttpServe";
import type { TargetBinarySource } from "./targetBinary/TargetBinarySource";
import { copyContentFiles } from "./util/copyContentFiles";

export class RunnerUnit {
	protected scenarioRunner: ScenarioRunner;
	protected preprocessor: Preprocessor | null;
	protected audioExtractor: AudioExtractor | null;

	constructor(scenarioRunner: ScenarioRunner, preprocessor: Preprocessor | null, audioExtractor: AudioExtractor | null) {
		this.scenarioRunner = scenarioRunner;
		this.preprocessor = preprocessor;
		this.audioExtractor = audioExtractor;
	}

	async run(entry: NormalizedReftestEntry): Promise<ReftestOutput> {
		let contentDirPath = copyContentFiles(entry.contentDirPath);
		if (entry.executionMode === "replay") {
			await injectReftestHelper(path.resolve(contentDirPath));
		}
		injectScripts(path.resolve(contentDirPath), entry.injectFilePath);
		if (this.preprocessor) {
			const oldDirPath = path.resolve(contentDirPath);
			contentDirPath = await this.preprocessor.run(path.resolve(contentDirPath));
			// preprocessor実行前のcontentDirPathは以降不要になるのでここで削除する
			// TODO: tmpファイルを削除するオプションを用意して、そのオプションが指定された時のみ削除するように
			fs.rmdirSync(oldDirPath, { recursive: true });
		}
		console.log(`contents : ${entry.selfPath}`);
		console.log(`scenario : ${entry.scenario.path}`);
		const ret = await this.scenarioRunner.run(
			path.resolve(contentDirPath),
			path.resolve(entry.scenario.path),
			entry.executionMode,
			entry.playTimes
		);
		if (entry.enableAudio && this.audioExtractor && ret.status !== "timeout") {
			const additional = await this.audioExtractor.run(
				path.resolve(contentDirPath),
				path.resolve(entry.scenario.path),
				entry.executionMode
			);
			ret.screenshots.push(additional);
		}
		// 一時的に用意したcontentDirPathは以降不要になるのでここで削除する
		// TODO: tmpファイルを削除するオプションを用意して、そのオプションが指定された時のみ削除するように
		fs.rmdirSync(contentDirPath, { recursive: true });
		return ret;
	}

	dispose(): Promise<unknown> {
		return Promise.all([
			this.preprocessor?.dispose(),
			this.audioExtractor?.dispose(),
			this.scenarioRunner.dispose()
		]);
	}

	getVersionInfo(): string {
		return [
			`preprocessor:${this.preprocessor?.getVersionInfo() ?? "none"}`,
			`scenarioRunner:${this.scenarioRunner.getVersionInfo()}`
		].join(", ");
	}
}

interface GetRunnerUnitParameterObject {
	testType: TestType;
	configure: NormalizedReftestConfigure;
}

export async function withRunnerUnit<T>(param: GetRunnerUnitParameterObject, fun: (ru: RunnerUnit) => Promise<T>): Promise<T> {
	const runnerUnit = await getRunnerUnit(param);
	try {
		return await fun(runnerUnit);
	} finally {
		await runnerUnit.dispose();
	}
}

async function getRunnerUnit(param: GetRunnerUnitParameterObject): Promise<RunnerUnit> {
	let scenarioRunner: ScenarioRunner;
	let preprocessor: Preprocessor | null = null;
	let audioExtractor: AudioExtractor | null = null;

	const versionLatest = "latest";
	let serveVer = versionLatest;
	if (param.configure.serveVer && param.configure.servePath == null) {
		serveVer = param.configure.serveVer;
	}
	// npmCacheDir にはデフォルトパスがあるので、nullにはならない想定
	const downloadDirPath = path.join(path.resolve(param.configure.npmCacheDir), "serve", serveVer);
	const serveBinSrc: TargetBinarySource = param.configure.servePath ?
		{ type: "local", path: path.resolve(param.configure.servePath) } :
		{
			type: "published",
			downloadDirPath: downloadDirPath,
			useNpmCache: param.configure.useNpmCache,
			version: serveVer
		};
	switch (param.testType) {
		case "sandbox":
			let sandboxVer = versionLatest;
			if (param.configure.sandboxVer && param.configure.sandboxPath == null) {
				sandboxVer = param.configure.sandboxVer;
			}
			const sandboxDownloadDirPath = path.join(path.resolve(param.configure.npmCacheDir), "sandbox", sandboxVer);
			const sandboxBinSrc: TargetBinarySource = param.configure.sandboxPath ?
				{ type: "local", path: path.resolve(param.configure.sandboxPath) } :
				{
					type: "published",
					downloadDirPath: sandboxDownloadDirPath,
					useNpmCache: param.configure.useNpmCache,
					version: sandboxVer
				};
			scenarioRunner = await createStaticHostScenarioRunner(await createAkashicSandbox(sandboxBinSrc));
			break;
		case "serve":
			scenarioRunner = await createServeScenarioRunner(serveBinSrc);
			audioExtractor = await createServeAudioExtractor(serveBinSrc);
			break;
		case "export-zip":
			const exportZipDownloadDirPath = path.join(path.resolve(param.configure.npmCacheDir), "export-zip", "latest");
			const exportZipBinarySource: TargetBinarySource = param.configure.exportZipPath ?
				{ type: "local", path: path.resolve(param.configure.exportZipPath) } :
				{
					type: "published",
					downloadDirPath: exportZipDownloadDirPath,
					useNpmCache:  param.configure.useNpmCache,
					version: versionLatest
				};
			preprocessor = await createExportZipPreprocessor(exportZipBinarySource);
			scenarioRunner = await createServeScenarioRunner(serveBinSrc);
			break;
		case "export-html":
			const exportHtmlDownloadDirPath = path.join(path.resolve(param.configure.npmCacheDir), "export-html", "latest");
			const exportHtmlBinarySource: TargetBinarySource = param.configure.exportHtmlPath ?
				{ type: "local", path: path.resolve(param.configure.exportHtmlPath) } :
				{
					type: "published",
					downloadDirPath: exportHtmlDownloadDirPath,
					useNpmCache:  param.configure.useNpmCache,
					version: versionLatest
				};
			preprocessor = await createExportHtmlPreprocessor(exportHtmlBinarySource);
			scenarioRunner = await createStaticHostScenarioRunner(new StaticHttpServe());
			break;
		case "android":
			if (!param.configure.android || !param.configure.android.apkPath || !param.configure.android.playlogClientPath) {
				throw new Error("not specified --android-apk-path <path> and --android-playlog-client-path <path>");
			}
			const params = {
				serveBinSrc,
				apkPath: path.resolve(param.configure.android.apkPath),
				playlogClientPath: path.resolve(param.configure.android.playlogClientPath),
				emulatorName: param.configure.android.emulator,
				appPackage: param.configure.android.appPackage,
				appActivity: param.configure.android.appActivity
			};
			scenarioRunner = await createAndroidScenarioRunner(params);
			break;
		default:
			throw new Error("Please specify --test-type <type>. <type> is serve, export-zip, export-html, android, or all.");
	}
	return new RunnerUnit(scenarioRunner, preprocessor, audioExtractor);
}
