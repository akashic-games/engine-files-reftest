import * as path from "path";
import { resolveRootDirPath } from "../../util/resolveRootDirPath";

describe("resolveRootDirPath", () => {
	test("各ファイルパスの共通パスが取得できる", () => {
		const filePaths = ["/tmp/hoge/reftest.entry.js", "/tmp/hoge/fuga/reftest.entry.js", "/tmp/hoge/reftest2.entry.js"];
		expect(resolveRootDirPath(filePaths)).toBe(path.resolve("/tmp/hoge"));
		const filePaths2 = ["/tmp/hoge/fuga/fuga/reftest.entry.js", "/tmp/hoge/fuga/reftest.entry.js", "/tmp/hoge/reftest2.entry.js"];
		expect(resolveRootDirPath(filePaths2)).toBe(path.resolve("/tmp/hoge"));
	});
	test("各ファイルパスの共通パスが存在しない場合/が取得される", () => {
		const filePaths = ["/tmp/hoge/reftest.entry.js", "/home/hogehoge/reftest.entry.js", "/tmp/hoge/reftest2.entry.js"];
		expect(resolveRootDirPath(filePaths)).toBe(path.resolve("/"));
	});
	test("ファイルパスが1つも指定されていない場合エラーになる", (done) => {
		try {
			resolveRootDirPath([]);
			done.fail();
		} catch (e: any) {
			expect(e.message).toBe("Can't resolve root directory path. Please specify file paths.");
			done();
		}
	});
});
