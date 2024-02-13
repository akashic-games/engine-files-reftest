import * as path from "path";
import type { ExecutionMode } from "../types/ExecutionMode";
import type { Scenario } from "../types/Scenario";

// テスト対象のコンテンツ実行に関わるものを一纏めにしたもの
export interface ReftestEntry {
	contentDirPath?: string; // コンテンツのパス
	scenario: Scenario; // コンテンツ実行時に使用するシナリオ
	executionMode: ExecutionMode; // コンテンツの実行方法
	expectedDirPath: string;  // 正解データのありかなども含めてひとつのテスト対象であると定義する
	injectFilePath?: string | string[]; // コンテンツのエントリポイントの先頭に差し込むスクリプトが書かれたファイルパス、複数指定可能
	enableAudio?: boolean; // 音声テストを実行するかどうか。デフォルトはfalse
	playTimes?: number; // シナリオランナーのループ回数を指定。デフォルトは 2
}

// ReftestEntryのプロパティを正規化したもの
export interface NormalizedReftestEntry {
	selfPath: string; // ReftestEntryが定義されているファイルの絶対パス。メタ情報の追加なので本来の正規化の意図とは異なるが、利便性のため例外的にここで情報を持つこととする。
	contentDirPath: string;
	scenario: Scenario;
	executionMode: ExecutionMode;
	expectedDirPath: string;
	injectFilePath: string[];
	enableAudio: boolean;
	playTimes: number;
}

export function normalizeReftestEntry(entry: ReftestEntry, selfPath: string): NormalizedReftestEntry {
	const basePath = path.dirname(selfPath);
	const contentDirPath = entry.contentDirPath ? path.resolve(basePath, entry.contentDirPath) : path.resolve(basePath);
	// 各パスはテスト対象ファイルからの相対パスになっているので、それぞれパス解決を行う。
	const expectedDirPath = path.resolve(basePath, entry.expectedDirPath);
	const scenarioPath = path.resolve(basePath, entry.scenario.path);
	let injectFilePath: string[];
	if (!entry.injectFilePath) {
		injectFilePath = [];
	} else if (typeof entry.injectFilePath === "string") {
		injectFilePath = [path.resolve(basePath, entry.injectFilePath)];
	} else {
		injectFilePath = entry.injectFilePath.map(p => path.resolve(basePath, p));
	}
	return {
		selfPath,
		contentDirPath,
		scenario: {
			type: "playlog",
			path: scenarioPath
		},
		executionMode: entry.executionMode,
		expectedDirPath,
		injectFilePath,
		enableAudio: entry.enableAudio ?? false,
		playTimes: entry.playTimes ?? 2,
	};
}
