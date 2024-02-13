import * as path from "path";
import type { ReftestEntry } from "../../configure/ReftestEntry";
import { normalizeReftestEntry } from "../../configure/ReftestEntry";

describe("ReftestEntry", () => {
	describe("normalizeReftestEntry", () => {
		const basePath = path.resolve("tmp");
		const reftestEntryPath = path.resolve(basePath, "reftest.entry.json");
		test("指定したreftestEntryの全プロパティのパスが解決された状態で返ってくる", () => {
			const reftestEntity: ReftestEntry = {
				contentDirPath: "content",
				scenario: {
					type: "playlog",
					path: "playlog.json"
				},
				executionMode: "passive",
				expectedDirPath: "expected",
				injectFilePath: ["inject1.js", "inject2.js"],
				enableAudio: true,
				playTimes: 1
			};
			expect(normalizeReftestEntry(reftestEntity, reftestEntryPath)).toEqual({
				selfPath: reftestEntryPath,
				contentDirPath: path.resolve(basePath, "content"),
				scenario: {
					type: "playlog",
					path: path.resolve(basePath, "playlog.json")
				},
				executionMode: "passive",
				expectedDirPath: path.resolve(basePath, "expected"),
				injectFilePath: [path.resolve(basePath, "inject1.js"), path.resolve(basePath, "inject2.js")],
				enableAudio: true,
				playTimes: 1
			});
		});
		test("contentDirPathが省略された場合、contentDirPathの値は第2引数で指定したパスのディレクトリと同じパスになる", () => {
			const reftestEntity: ReftestEntry = {
				scenario: {
					type: "playlog",
					path: "playlog.json"
				},
				executionMode: "passive",
				expectedDirPath: "expected",
				injectFilePath: ["inject1.js", "inject2.js"],
				enableAudio: true,
				playTimes: 1
			};
			expect(normalizeReftestEntry(reftestEntity, reftestEntryPath)).toEqual({
				selfPath: reftestEntryPath,
				contentDirPath: basePath,
				scenario: {
					type: "playlog",
					path: path.resolve(basePath, "playlog.json")
				},
				executionMode: "passive",
				expectedDirPath: path.resolve(basePath, "expected"),
				injectFilePath: [path.resolve(basePath, "inject1.js"), path.resolve(basePath, "inject2.js")],
				enableAudio: true,
				playTimes: 1
			});
		});
		test("injectFilePathが省略された場合、injectFilePathの値は空の配列となる", () => {
			const reftestEntity: ReftestEntry = {
				scenario: {
					type: "playlog",
					path: "playlog.json"
				},
				executionMode: "passive",
				expectedDirPath: "expected",
				enableAudio: true,
				playTimes: 1
			};
			expect(normalizeReftestEntry(reftestEntity, reftestEntryPath)).toEqual({
				selfPath: reftestEntryPath,
				contentDirPath: basePath,
				scenario: {
					type: "playlog",
					path: path.resolve(basePath, "playlog.json")
				},
				executionMode: "passive",
				expectedDirPath: path.resolve(basePath, "expected"),
				injectFilePath: [],
				enableAudio: true,
				playTimes: 1
			});
		});
		test("injectFilePathが文字列の場合、injectFilePathの値はその文字列のみが要素の配列となる", () => {
			const reftestEntity: ReftestEntry = {
				scenario: {
					type: "playlog",
					path: "playlog.json"
				},
				executionMode: "passive",
				expectedDirPath: "expected",
				injectFilePath: "inject.js",
				enableAudio: true,
				playTimes: 1
			};
			expect(normalizeReftestEntry(reftestEntity, reftestEntryPath)).toEqual({
				selfPath: reftestEntryPath,
				contentDirPath: basePath,
				scenario: {
					type: "playlog",
					path: path.resolve(basePath, "playlog.json")
				},
				executionMode: "passive",
				expectedDirPath: path.resolve(basePath, "expected"),
				injectFilePath: [path.resolve(basePath, "inject.js")],
				enableAudio: true,
				playTimes: 1
			});
		});
		test("enableAudioが省略された場合、enableAudioの値はfalseとなる", () => {
			const reftestEntity: ReftestEntry = {
				contentDirPath: "content",
				scenario: {
					type: "playlog",
					path: "playlog.json"
				},
				executionMode: "passive",
				expectedDirPath: "expected",
				injectFilePath: ["inject1.js", "inject2.js"],
				playTimes: 1
			};
			expect(normalizeReftestEntry(reftestEntity, reftestEntryPath)).toEqual({
				selfPath: reftestEntryPath,
				contentDirPath: path.resolve(basePath, "content"),
				scenario: {
					type: "playlog",
					path: path.resolve(basePath, "playlog.json")
				},
				executionMode: "passive",
				expectedDirPath: path.resolve(basePath, "expected"),
				injectFilePath: [path.resolve(basePath, "inject1.js"), path.resolve(basePath, "inject2.js")],
				enableAudio: false,
				playTimes: 1
			});
		});
		test("playTimesが省略された場合、playTimesの値は2となる", () => {
			const reftestEntity: ReftestEntry = {
				contentDirPath: "content",
				scenario: {
					type: "playlog",
					path: "playlog.json"
				},
				executionMode: "passive",
				expectedDirPath: "expected",
				injectFilePath: ["inject1.js", "inject2.js"],
				enableAudio: true
			};
			expect(normalizeReftestEntry(reftestEntity, reftestEntryPath)).toEqual({
				selfPath: reftestEntryPath,
				contentDirPath: path.resolve(basePath, "content"),
				scenario: {
					type: "playlog",
					path: path.resolve(basePath, "playlog.json")
				},
				executionMode: "passive",
				expectedDirPath: path.resolve(basePath, "expected"),
				injectFilePath: [path.resolve(basePath, "inject1.js"), path.resolve(basePath, "inject2.js")],
				enableAudio: true,
				playTimes: 2
			});
		});
	});
});
