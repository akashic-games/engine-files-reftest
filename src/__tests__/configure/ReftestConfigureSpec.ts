import * as os from "os";
import * as path from "path";
import type { ReftestCommandOption} from "../../configure/ReftestConfigure";
import { createReftestConfigure, resolveTestTypes } from "../../configure/ReftestConfigure";

describe("ReftestConfigure", () => {
	describe("createReftestConfigure", () => {
		test("設定ファイルの指定が無い場合デフォルト値が返ってくる", () => {
			const result = createReftestConfigure({});
			expect(result.testType).toBeNull();
			expect(result.targets).toEqual([]);
			expect(result.update).toBeFalsy();
			expect(result.updateDiff).toBeFalsy();
			expect(result.sandboxVer).toBeNull();
			expect(result.serveVer).toBeNull();
			expect(result.sandboxPath).toBeNull();
			expect(result.servePath).toBeNull();
			expect(result.exportHtmlPath).toBeNull();
			expect(result.exportZipPath).toBeNull();
			expect(result.diffDirPath).toBeNull();
			expect(result.errorDiffDirPath).toBeNull();
			expect(result.threshold).toBe(0);
			expect(result.android).toBeNull();
			expect(result.outputHtml).toBeNull();
			expect(result.timeoutErrorDirPath).toBeNull();
			expect(result.errorDiffDirPath).toBeNull();
			expect(result.useNpmCache).toBeFalsy();
			expect(result.npmCacheDir).toBe(path.resolve(".", "__bincache"));
			expect(result.tempDownlodDir.indexOf(path.join(os.tmpdir(), "reftest_")) !== -1).toBeTruthy();
		});

		test("useNpmCache が真の時、npmCacheDir がキャッシュ用のディレクトリとなる", () => {
			const result = createReftestConfigure({ useNpmCache: true });
			expect(result.useNpmCache).toBeTruthy();
			expect(result.npmCacheDir).toBe(path.resolve(".", "__bincache"));
		});
		test("設定ファイルの指定がある場合は設定ファイルで指定した値が返ってくる", () => {
			const result = createReftestConfigure({ configure: path.resolve(__dirname, "../fixture/reftest.config.json") });
			expect(result.testType).toBe("serve");
			expect(result.targets).toEqual([path.resolve(__dirname, "../fixture/sample1/reftest.entry.json")]);
			expect(result.update).toBeFalsy();
			expect(result.updateDiff).toBeFalsy();
			expect(result.sandboxVer).toBeNull();
			expect(result.serveVer).toBeNull();
			expect(result.sandboxPath).toBeNull();
			expect(result.servePath).toBeNull();
			expect(result.exportHtmlPath).toBeNull();
			expect(result.exportZipPath).toBeNull();
			expect(result.diffDirPath).toBeNull();
			expect(result.errorDiffDirPath).toBeNull();
			expect(result.threshold).toBe(0);
			expect(result.outputHtml).toBeNull();
			expect(result.timeoutErrorDirPath).toBeNull();
			expect(result.errorDiffDirPath).toBeNull();
			expect(result.useNpmCache).toBeFalsy();
			expect(result.npmCacheDir).toBe(path.resolve(path.resolve(__dirname, "../fixture"), "__bincache"));
			expect(result.tempDownlodDir.indexOf(path.join(os.tmpdir(), "reftest_")) !== -1).toBeTruthy();
		});
		test("設定ファイルの指定がある場合は設定ファイルで指定した値が返ってくる", () => {
			const result = createReftestConfigure({ configure: path.resolve(__dirname, "../fixture/reftest.config.json") });
			expect(result.testType).toBe("serve");
			expect(result.targets).toEqual([path.resolve(__dirname, "../fixture/sample1/reftest.entry.json")]);
			expect(result.update).toBeFalsy();
			expect(result.updateDiff).toBeFalsy();
			expect(result.sandboxVer).toBeNull();
			expect(result.serveVer).toBeNull();
			expect(result.sandboxPath).toBeNull();
			expect(result.servePath).toBeNull();
			expect(result.exportHtmlPath).toBeNull();
			expect(result.exportZipPath).toBeNull();
			expect(result.diffDirPath).toBeNull();
			expect(result.errorDiffDirPath).toBeNull();
			expect(result.threshold).toBe(0);
			expect(result.outputHtml).toBeNull();
			expect(result.timeoutErrorDirPath).toBeNull();
			expect(result.errorScreenshotDirPath).toBeNull();
			expect(result.useNpmCache).toBeFalsy();
			expect(result.npmCacheDir).toBe(path.resolve(path.resolve(__dirname, "../fixture"), "__bincache"));
			expect(result.tempDownlodDir.indexOf(path.join(os.tmpdir(), "reftest_")) !== -1).toBeTruthy();
		});
		test("設定ファイルとその他オプションの指定がある場合はオプションで指定した値が優先される", () => {
			const option: ReftestCommandOption = {
				configure: path.resolve(__dirname, "../fixture/reftest.config.json"),
				testType: "all",
				target: [path.resolve(__dirname, "../fixture/**/reftest.entry.js")],
				update: true,
				updateDiff: false,
				threshold: 0.03,
				androidApkPath: path.resolve("/tmp/test.apk"),
				androidPlaylogClientPath: path.resolve("/tmp/palylogClient.js"),
				androidAppActivity: "example.test",
				androidAppPackage: ".Example"
			};
			const result = createReftestConfigure(option);
			expect(result.testType).toBe("all");
			expect(result.targets).toEqual([
				path.resolve(__dirname, "../fixture/sample1/reftest.entry.json"),
				path.resolve(__dirname, "../fixture/**/reftest.entry.js")
			]);
			expect(result.update).toBeTruthy();
			expect(result.updateDiff).toBeFalsy();
			expect(result.sandboxVer).toBeNull();
			expect(result.serveVer).toBeNull();
			expect(result.sandboxPath).toBeNull();
			expect(result.servePath).toBeNull();
			expect(result.exportHtmlPath).toBeNull();
			expect(result.exportZipPath).toBeNull();
			expect(result.diffDirPath).toBeNull();
			expect(result.errorDiffDirPath).toBeNull();
			expect(result.threshold).toBe(0.03);
			expect(result.android).toEqual({
				apkPath: path.resolve("/tmp/test.apk"),
				emulator: null,
				playlogClientPath: path.resolve("/tmp/palylogClient.js"),
				appActivity: "example.test",
				appPackage: ".Example"

			});
			expect(result.outputHtml).toBeNull();
			expect(result.timeoutErrorDirPath).toBeNull();
			expect(result.errorScreenshotDirPath).toBeNull();
			expect(result.useNpmCache).toBeFalsy();
			expect(result.npmCacheDir).toBe(path.resolve(path.resolve(__dirname, "../fixture"), "__bincache"));
			expect(result.tempDownlodDir.indexOf(path.join(os.tmpdir(), "reftest_")) !== -1).toBeTruthy();
		});
		test("設定ファイルが存在しない場合はエラーになる", (done) => {
			const notExistConfigPath = path.resolve(__dirname, "../fixture/notexist.config.json");
			try {
				createReftestConfigure({ configure: notExistConfigPath });
				done.fail();
			} catch (err: any) {
				expect(err.message).toBe(`not exist ${notExistConfigPath}`);
				done();
			}
		});
	});
	describe("resolveTestTypes", () => {
		test("指定したtestTypeがそのまま返ってくる", () => {
			expect(resolveTestTypes("serve")).toEqual(["serve"]);
			expect(resolveTestTypes("export-html")).toEqual(["export-html"]);
			expect(resolveTestTypes("export-zip")).toEqual(["export-zip"]);
			expect(resolveTestTypes("sandbox")).toEqual(["sandbox"]);
			expect(resolveTestTypes("android")).toEqual(["android"]);
		});
		test("testTypeの指定がundefinedもしくはnullもしくはallなら全てのtestTypeが配列で返ってくる", () => {
			const result1 = resolveTestTypes(undefined);
			const result2 = resolveTestTypes(null);
			const result3 = resolveTestTypes("all");
			["serve", "export-html", "export-zip", "sandbox", "android"].forEach(type => {
				expect(result1).toContain(type);
				expect(result2).toContain(type);
				expect(result3).toContain(type);
			});
		});
		test("testTypeの指定がall-pcならandroid全てのtestTypeが配列で返ってくる", () => {
			const result = resolveTestTypes("all-pc");
			["serve", "export-html", "export-zip", "sandbox"].forEach(type => {
				expect(result).toContain(type);
			});
		});
	});
});
