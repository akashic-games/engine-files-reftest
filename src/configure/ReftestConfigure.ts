import * as fs from "fs";
import * as path from "path";

const DEFAULT_REFTEST_CONFIGURE = "reftest.config.json";

export const TEST_TYPES = ["sandbox", "serve", "export-zip", "export-html", "android"] as const;
export type TestType = typeof TEST_TYPES[number];
export type CommandOptionTestType = TestType | "all" | "all-pc";

export const testTypesAll: TestType[] = [...TEST_TYPES];
export const testTypesAllPc: TestType[] = ["sandbox", "serve", "export-zip", "export-html"];

export interface ReftestCommandOption {
	configure?: string;
	testType?: CommandOptionTestType;
	target?: string[];
	update?: boolean;
	updateDiff?: boolean;
	sandboxVer?: string;
	serveVer?: string;
	sandboxPath?: string;
	servePath?: string;
	exportHtmlPath?: string;
	exportZipPath?: string;
	diffDirPath?: string;
	errorDiffDirPath?: string;
	threshold?: number;
	androidApkPath?: string;
	androidPlaylogClientPath?: string;
	androidEmulator?: string;
	androidAppPackage?: string;
	androidAppActivity?: string;
	outputHtml?: string;
	timeoutErrorDirPath?: string;
	useNpmCache?: boolean;
	npmCacheDirPath?: string;
}

export interface AndroidConfigure {
	apkPath: string | null;
	playlogClientPath: string | null;
	emulator: string | null;
	appPackage: string | null;
	appActivity: string | null;
}

export interface ReftestConfigure {
	testType: CommandOptionTestType | null;
	targets: string[];
	update: boolean | false;
	updateDiff: boolean | false;
	sandboxVer: string | null;
	serveVer: string | null;
	sandboxPath: string | null;
	servePath: string | null;
	exportHtmlPath: string | null;
	exportZipPath: string | null;
	diffDirPath: string | null;
	errorDiffDirPath: string | null;
	threshold: number | null;
	android: AndroidConfigure | null;
	outputHtml: string | null;
	timeoutErrorDirPath: string | null;
	useNpmCache: boolean | false;
	npmCacheDir: string | null;
}

// 設定ファイルとコマンド指定されたオプションからReftestConfigureを生成する
// ここでは設定ファイルとオプションの突き合わせを行うだけで値の整形は行わない。ただし設定ファイルから指定されたパスについては設定ファイルのパスが分からないとパス解決ができないためここでパス解決する
export function createReftestConfigure(option: ReftestCommandOption): ReftestConfigure {
	let configurePath: string | null = null;
	// 設定ファイル読み込み
	if (option.configure) {
		if (!fs.existsSync(path.resolve(option.configure))) {
			throw new Error(`not exist ${option.configure}`);
		}
		configurePath = path.resolve(option.configure);
	} else if (fs.existsSync(path.join(process.cwd(), DEFAULT_REFTEST_CONFIGURE))) {
		configurePath = path.join(process.cwd(), DEFAULT_REFTEST_CONFIGURE);
	}
	let configure: ReftestConfigure;
	if (configurePath) {
		// 設定ファイルの動的読み込みのため、require の lint エラーを抑止
		/* eslint-disable @typescript-eslint/no-var-requires */
		configure = require(configurePath) as ReftestConfigure;
	} else {
		configure = {
			testType: null,
			targets: [],
			update: false,
			updateDiff: false,
			sandboxVer: null,
			serveVer: null,
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
			npmCacheDir: null,
		};
	}
	const dirPath = configurePath ? path.dirname(configurePath) : ".";
	// optionで指定されている場合は設定ファイルで指定された内容を上書きする
	configure.testType = option.testType ?? configure.testType;
	configure.targets = (configure.targets ?? []).map(p => path.resolve(dirPath, p)).concat(option.target ?? []);
	configure.update = option.update ?? (configure.update ?? false);
	configure.updateDiff = option.updateDiff ?? (configure.updateDiff ?? false);
	configure.sandboxVer = option.sandboxVer ?? (configure.sandboxVer ?? null);
	configure.serveVer = option.serveVer ?? (configure.serveVer ?? null);
	configure.sandboxPath = option.sandboxPath ?? resolvePath(dirPath, configure.sandboxPath);
	configure.servePath = option.servePath ?? resolvePath(dirPath, configure.servePath);
	configure.exportHtmlPath = option.exportHtmlPath ?? resolvePath(dirPath, configure.exportHtmlPath);
	configure.exportZipPath = option.exportZipPath ?? resolvePath(dirPath, configure.exportZipPath);
	configure.diffDirPath = option.diffDirPath ?? resolvePath(dirPath, configure.diffDirPath);
	configure.errorDiffDirPath = option.errorDiffDirPath ?? resolvePath(dirPath, configure.errorDiffDirPath);
	configure.threshold = option.threshold ?? (configure.threshold ?? null);
	configure.outputHtml = option.outputHtml ?? resolvePath(dirPath, configure.outputHtml);
	configure.timeoutErrorDirPath = option.timeoutErrorDirPath ?? resolvePath(dirPath, configure.timeoutErrorDirPath);
	configure.useNpmCache = option.useNpmCache ?? (configure.useNpmCache ?? false);
	configure.npmCacheDir = option.npmCacheDirPath ?? resolvePath(dirPath, ".bincache");
	if (option.androidApkPath || option.androidPlaylogClientPath) {
		if (!configure.android) {
			configure.android = {
				apkPath: null,
				playlogClientPath: null,
				emulator: null,
				appPackage: null,
				appActivity: null
			};
		}
		configure.android.apkPath = option.androidApkPath ?? resolvePath(dirPath, configure.android.apkPath);
		configure.android.playlogClientPath = option.androidPlaylogClientPath ?? resolvePath(dirPath, configure.android.playlogClientPath);
		configure.android.emulator = option.androidEmulator ?? (configure.android.emulator ?? null);
		configure.android.appPackage = option.androidAppPackage ?? (configure.android.appPackage ?? null);
		configure.android.appActivity = option.androidAppActivity ?? (configure.android.appActivity ?? null);
	}
	return configure;
}

export function resolveTestTypes(type: CommandOptionTestType | null | undefined): Readonly<TestType>[] {
	return (
		(!type || type === "all") ? testTypesAll :
		(type === "all-pc") ? testTypesAllPc : [type]
	);
}

function resolvePath(dirPath: string, targetPath: string | null = null): string | null {
	return targetPath != null ? path.resolve(dirPath, targetPath) : null;
}
