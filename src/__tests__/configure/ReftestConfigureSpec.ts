import * as path from "path";
import type { ReftestCommandOption} from "../../configure/ReftestConfigure";
import { createReftestConfigure, resolveTestTypes } from "../../configure/ReftestConfigure";

describe("ReftestConfigure", () => {
	describe("createReftestConfigure", () => {
		test("設定ファイルの指定が無い場合デフォルト値が返ってくる", () => {
			const result = createReftestConfigure({});
			expect(result).toEqual({
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
				threshold: 0,
				android: null,
				outputHtml: null,
				timeoutErrorDirPath: null,
				useNpmCache: false,
				npmCacheDir: path.resolve(".", "__bincache")
			});
		});
		test("設定ファイルの指定がある場合は設定ファイルで指定した値が返ってくる", () => {
			const result = createReftestConfigure({ configure: path.resolve(__dirname, "../fixture/reftest.config.json") });
			expect(result).toEqual({
				testType: "serve",
				targets: [path.resolve(__dirname, "../fixture/sample1/reftest.entry.json")],
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
				threshold: 0,
				outputHtml: null,
				timeoutErrorDirPath: null,
				useNpmCache: false,
				npmCacheDir: path.resolve(path.resolve(__dirname, "../fixture"), "__bincache")
			});
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
			expect(result).toEqual({
				testType: "all",
				targets: [
					path.resolve(__dirname, "../fixture/sample1/reftest.entry.json"),
					path.resolve(__dirname, "../fixture/**/reftest.entry.js")
				],
				update: true,
				updateDiff: false,
				sandboxVer: null,
				serveVer: null,
				sandboxPath: null,
				servePath: null,
				exportHtmlPath: null,
				exportZipPath: null,
				diffDirPath: null,
				errorDiffDirPath: null,
				threshold: 0.03,
				outputHtml: null,
				timeoutErrorDirPath: null,
				useNpmCache: false,
				npmCacheDir: path.resolve(path.resolve(__dirname, "../fixture"), "__bincache"),
				android: {
					apkPath: path.resolve("/tmp/test.apk"),
					emulator: null,
					playlogClientPath: path.resolve("/tmp/palylogClient.js"),
					appActivity: "example.test",
					appPackage: ".Example"
				}
			});
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
