import type { FileDiff } from "../util/FileDiff";

export type ReftestResultStatus = "succeeded" | "failed" | "skipped" | "timeout";

export interface ReftestResult {
	fileDiffs: FileDiff[]; // 出力画像の検証結果
	status: ReftestResultStatus;
}
