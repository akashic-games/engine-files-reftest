import * as path from "path";
import type { AudioExtractor } from "../audioExtractor/AudioExtractor";
import { createServeAudioExtractor } from "../audioExtractor/createServeAudioExtractor";
import type { ReftestConfigure } from "../configure/ReftestConfigure";
import type { NormalizedReftestEntry } from "../configure/ReftestEntry";
import type { Preprocessor } from "../preprocessor/Preprocessor";
import { RunnerUnit, withRunnerUnit } from "../RunnerUnit";
import { injectReftestHelper, injectScripts } from "../scenarioRunner/injectToContent";
import type { ScenarioRunner } from "../scenarioRunner/ScenarioRunner";
import { MockAudioExtractor } from "./helpers/MockAudioExtractor";
import { MockPreprocessor } from "./helpers/MockPreprocessor";
import { MockScenarionRunner } from "./helpers/MockScenarioRunner";

let screnarioRunnerStr: string | null;
let preprocessorStr: string | null;

// TODO: ここでモックしているものの単体テストを行い、モックを減らしていく
jest.mock("fs", () => {
	return {
		rmdirSync: (_path: string): void => {
			// do nothing
		}
	};
});
jest.mock("../util/copyContentFiles", () => {
	return {
		copyContentFiles: (dir: string): string => {
			return dir;
		}
	};
});
jest.mock("../scenarioRunner/injectToContent", () => {
	return {
		injectReftestHelper: jest.fn(() => Promise.resolve()),
		injectScripts: jest.fn(() => {
			// do nothing
		})
	};
});
jest.mock("../scenarioRunner/android/createAndroidScenarioRunner", () => {
	return {
		createAndroidScenarioRunner: (): Promise<ScenarioRunner> => {
			screnarioRunnerStr = "android";
			return Promise.resolve(new MockScenarionRunner());
		}
	};
});
jest.mock("../scenarioRunner/serve/createServeScenarioRunner", () => {
	return {
		createServeScenarioRunner: (): Promise<ScenarioRunner> => {
			screnarioRunnerStr = "serve";
			return Promise.resolve(new MockScenarionRunner());
		}
	};
});
jest.mock("../scenarioRunner/staticHost/createStaticHostScenarioRunner", () => {
	return {
		createStaticHostScenarioRunner: (): Promise<ScenarioRunner> => {
			screnarioRunnerStr = "static-host";
			return Promise.resolve(new MockScenarionRunner());
		}
	};
});
jest.mock("../preprocessor/createExportHtmlPreprocessor", () => {
	return {
		createExportHtmlPreprocessor: (): Promise<Preprocessor> => {
			preprocessorStr = "export-html";
			return Promise.resolve(new MockPreprocessor());
		}
	};
});
jest.mock("../preprocessor/createExportZipPreprocessor", () => {
	return {
		createExportZipPreprocessor: (): Promise<Preprocessor> => {
			preprocessorStr = "export-zip";
			return Promise.resolve(new MockPreprocessor());
		}
	};
});
jest.mock("../audioExtractor/createServeAudioExtractor", () => {
	return {
		createServeAudioExtractor: jest.fn(() => Promise.resolve(new MockAudioExtractor()))
	};
});

describe("RunnerUnit", () => {
	describe("run", () => {
		let scenarioRunner: ScenarioRunner;
		let preprocessor: Preprocessor;
		let audioExtractor: AudioExtractor;
		let reftestEntry: NormalizedReftestEntry;
		beforeEach(() => {
			jest.resetAllMocks();
			scenarioRunner = new MockScenarionRunner();
			jest.spyOn(scenarioRunner, "run");
			preprocessor = new MockPreprocessor();
			jest.spyOn(preprocessor, "run");
			audioExtractor = new MockAudioExtractor();
			jest.spyOn(audioExtractor, "run");
			reftestEntry = {
				selfPath: path.resolve("./fixture/sample1"),
				contentDirPath: "./fixture/sample1",
				scenario: {
					type: "playlog",
					path: "./fixture/sample1/playlog.json"
				},
				executionMode: "passive",
				expectedDirPath: "./fixture/sample1/expected",
				injectFilePath: [],
				enableAudio: true,
				playTimes: 1
			};
		});
		test("passiveモードでPreprocessor無しの場合、指定されたスクリプトが差し込まれたディレクトリに対してScenarioRunnerが実行される", async () => {
			const runnerUnit = new RunnerUnit(scenarioRunner, null, null);
			const result = await runnerUnit.run(reftestEntry);
			// run() の戻り型 `ReftestOutput` の `ReftestOutputTimeout` は screenshots プロパティが存在しないため参照するとエラーとなる。status 判定してビルドを通している。
			if (result.status !== "succeeded") throw new Error("failed because status is different");
			expect(injectScripts).toHaveBeenCalledTimes(1);
			expect(injectReftestHelper).toHaveBeenCalledTimes(0);
			expect(result.status).toBe("succeeded");
			expect(result.screenshots).toHaveLength(0);
			expect(scenarioRunner.run).toBeCalledWith(
				path.resolve(reftestEntry.contentDirPath),
				path.resolve(reftestEntry.scenario.path),
				"passive",
				1
			);
		});
		test("replayモードでPreprocessor無しの場合、指定されたスクリプトとhelperモジュールが差し込まれたディレクトリに対してScenarioRunnerが実行される", async () => {
			const runnerUnit = new RunnerUnit(scenarioRunner, null, null);
			reftestEntry.executionMode = "replay";
			const result = await runnerUnit.run(reftestEntry);
			if (result.status !== "succeeded") throw new Error("failed because status is different");
			expect(injectScripts).toHaveBeenCalledTimes(1);
			expect(injectReftestHelper).toHaveBeenCalledTimes(1);
			expect(result.status).toBe("succeeded");
			expect(result.screenshots).toHaveLength(0);
			expect(scenarioRunner.run).toBeCalledWith(
				path.resolve(reftestEntry.contentDirPath),
				path.resolve(reftestEntry.scenario.path),
				"replay",
				1
			);
		});
		test("passiveモードでPreprocessorありの場合、Preprocessorが実行され、指定されたスクリプトが差し込まれたディレクトリに対してScenarioRunnerが実行される", async () => {
			const runnerUnit = new RunnerUnit(scenarioRunner, preprocessor, null);
			const result = await runnerUnit.run(reftestEntry);
			if (result.status !== "succeeded") throw new Error("failed because status is different");
			expect(injectScripts).toHaveBeenCalledTimes(1);
			expect(injectReftestHelper).toHaveBeenCalledTimes(0);
			expect(result.status).toBe("succeeded");
			expect(result.screenshots).toHaveLength(0);
			expect(scenarioRunner.run).toBeCalledWith(
				path.resolve(reftestEntry.contentDirPath),
				path.resolve(reftestEntry.scenario.path),
				"passive",
				1
			);
			expect(preprocessor.run).toBeCalled();
		});
		test("replayモードでPreprocessorありの場合、Preprocessorが実行され、指定されたスクリプトとhelperモジュールが差し込まれたディレクトリに対してScenarioRunnerが実行される", async () => {
			const runnerUnit = new RunnerUnit(scenarioRunner, preprocessor, null);
			reftestEntry.executionMode = "replay";
			const result = await runnerUnit.run(reftestEntry);
			if (result.status !== "succeeded") throw new Error("failed because status is different");
			expect(injectScripts).toHaveBeenCalledTimes(1);
			expect(injectReftestHelper).toHaveBeenCalledTimes(1);
			expect(result.status).toBe("succeeded");
			expect(result.screenshots).toHaveLength(0);
			expect(scenarioRunner.run).toBeCalledWith(
				path.resolve(reftestEntry.contentDirPath),
				path.resolve(reftestEntry.scenario.path),
				"replay",
				1
			);
			expect(preprocessor.run).toBeCalled();
		});
		// AudioExtractorの実行は一時的に止めているためテストもスキップ
		test("AudioExtractorありの場合、ScenarioRunnerと同様のシグニチャでAudioExtractorが実行される", async () => {
			const runnerUnit = new RunnerUnit(scenarioRunner, null, audioExtractor);
			const result = await runnerUnit.run(reftestEntry);
			if (result.status !== "succeeded") throw new Error("failed because status is different");
			expect(injectScripts).toHaveBeenCalledTimes(1);
			expect(injectReftestHelper).toHaveBeenCalledTimes(0);
			expect(scenarioRunner.run).toBeCalledWith(
				path.resolve(reftestEntry.contentDirPath),
				path.resolve(reftestEntry.scenario.path),
				"passive",
				1
			);
			expect(audioExtractor.run).toBeCalledWith(
				path.resolve(reftestEntry.contentDirPath),
				path.resolve(reftestEntry.scenario.path),
				"passive"
			);
			expect(result.status).toBe("succeeded");
			expect(result.screenshots).toHaveLength(1);
			expect(result.screenshots[0].base64).toBe("");
			expect(result.screenshots[0].fileName).toBe("mock.png");
		});
	});
});

describe("withRunnerUnit", () => {
	let reftestConfigure: ReftestConfigure;
	beforeEach(() => {
		jest.resetAllMocks();
		screnarioRunnerStr = null;
		preprocessorStr = null;
		reftestConfigure = {
			testType: null,
			targets: [],
			update: false,
			updateDiff: false,
			sandboxPath: null,
			servePath: null,
			exportHtmlPath: null,
			exportZipPath: null,
			diffDirPath: null,
			errorDiffDirPath: null,
			threshold: null,
			android: null,
			outputHtml: null,
			timeoutErrorDirPath: null,
			useNpmCache: false,
			npmCacheDir: path.resolve(".", ".npmcache")
		};
	});
	test("testTypeがserveの場合、createServeScenarioRunner関数とcreateWebbrowserAudioExtractor関数が実行される", async () => {
		await withRunnerUnit({testType: "serve", configure: reftestConfigure}, () => {
			expect(screnarioRunnerStr).toBe("serve");
			expect(preprocessorStr).toBeNull();
			expect(createServeAudioExtractor).toHaveBeenCalledTimes(1);
			return Promise.resolve();
		});
	});
	// createAkashicSandbox() 実行時に存在しないパスを参照しにいき必ずエラーになるためここだけテストを無効化している
	// TODO: createAkashicSandbox()のモック化もしくはエラーが出ないようにする
	xtest("testTypeがsandboxの場合、createStaticHostScenarioRunner関数が実行される", async () => {
		await withRunnerUnit({testType: "sandbox", configure: reftestConfigure}, () => {
			expect(screnarioRunnerStr).toBe("static-host");
			expect(preprocessorStr).toBeNull();
			expect(createServeAudioExtractor).toHaveBeenCalledTimes(0);
			return Promise.resolve();
		});
	});
	test("testTypeがexport-zipの場合、createServeScenarioRunner関数とcreateExportZipPreprocessor関数が実行される", async () => {
		await withRunnerUnit({testType: "export-zip", configure: reftestConfigure}, () => {
			expect(screnarioRunnerStr).toBe("serve");
			expect(preprocessorStr).toBe("export-zip");
			expect(createServeAudioExtractor).toHaveBeenCalledTimes(0);
			return Promise.resolve();
		});
	});
	test("testTypeがexport-htmlの場合、createStaticHostScenarioRunner関数とcreateExportHtmlPreprocessor関数が実行される", async () => {
		await withRunnerUnit({testType: "export-html", configure: reftestConfigure}, () => {
			expect(screnarioRunnerStr).toBe("static-host");
			expect(preprocessorStr).toBe("export-html");
			expect(createServeAudioExtractor).toHaveBeenCalledTimes(0);
			return Promise.resolve();
		});
	});
	test("testTypeがandroidの場合、createAndroidScenarioRunner関数が実行される", async () => {
		reftestConfigure.android = {
			apkPath: "/tmp/sample.apk",
			playlogClientPath: "/tmp/playlog-client.js",
			emulator: null,
			appActivity: null,
			appPackage: null
		};
		await withRunnerUnit({testType: "android", configure: reftestConfigure}, () => {
			expect(screnarioRunnerStr).toBe("android");
			expect(preprocessorStr).toBeNull();
			expect(createServeAudioExtractor).toHaveBeenCalledTimes(0);
			return Promise.resolve();
		});
	});
	test("testTypeがandroidの場合、playlog-clientのパスやapkのパスの指定が無い時エラーになる", (done) => {
		withRunnerUnit({testType: "android", configure: reftestConfigure}, () => Promise.resolve())
			.then(() => done.fail())
			.catch((err: Error) => {
				expect(err.message).toBe("not specified --android-apk-path <path> and --android-playlog-client-path <path>");
				done();
			});
	});
});
