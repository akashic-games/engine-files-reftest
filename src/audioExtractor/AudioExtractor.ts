import type { ExecutionMode } from "../types/ExecutionMode";
import type { Screenshot } from "../types/Screenshot";

export interface AudioExtractor {
	/**
	 * 与えられたコンテンツを実行し、コンテンツの音声データを波形画像化したものを取得する
	 *
	 * ただし実装の制約上、波形画像の厳密さは保証されない。
	 */
	run: (
		contentDirPath: string,
		scenarioPath: string,
		mode: ExecutionMode
	) => Promise<Screenshot>;

	/**
	 * AudioExtractorを破棄する。
	 * install したものがあれば uninstall する。
	 */
	dispose(): Promise<void>;
}

// この辺りのパラメータは決め打ちになってしまっているので、何かしらの手段で設定できるようにすべき
export const AUDIO_IMAGE_FILE_NAME: string = "audio.png";
export const THRESHOLD_FOR_AUDIO_IMAGE: number = Number(process.env.AUDIO_REFTEST_THRESHOLD) || 0.07;
