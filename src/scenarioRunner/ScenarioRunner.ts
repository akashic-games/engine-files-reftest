import type { ExecutionMode } from "../types/ExecutionMode";
import type { Screenshot } from "../types/Screenshot";

interface ReftestOutputSucceeded {
	status: "succeeded";
	screenshots: Screenshot[];
}
interface ReftestOutputSkipped {
	status: "skipped-unsupported";
	screenshots: Screenshot[];
}
interface ReftestOutputTimeout {
	status: "timeout";
	timeoutImage: Screenshot;
}

export type ReftestOutput = ReftestOutputSucceeded | ReftestOutputSkipped | ReftestOutputTimeout;

export interface ScenarioRunner {
	/**
	 * 与えられたコンテンツを実行し、スクリーンショットを取得する。
	 *
	 * mode: "replay" なら scenarioPath の playlog をコンテンツに流し込む。
	 *
	 * mode: "passive" なら scenarioPath の playlog に従って外部からコンテンツを操作する。
	 * 実装の制約上、操作やスクシーンショット取得タイミングの厳密さは保証されない。
	 * 事実上、時間経過で勝手に進行しないコンテンツである必要がある。
	 *
	 * 実装によってはいずれかの mode がサポートされない場合がある。(e.g. HTML を file:// で開く実装では、playlog は流し込めない)
	 */
	run(contentDirPath: string, scenarioPath: string, mode: ExecutionMode, playTimes: number): Promise<ReftestOutput>;

	/**
	 * シナリオランナーを破棄する。
	 * install したものがあれば uninstall する。
	 */
	dispose(): Promise<void>;

	/**
	 * 利用しているツールのバージョン情報を取得する。
	*/
	getVersionInfo(): string;
}
