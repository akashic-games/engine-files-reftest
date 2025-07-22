import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as pl from "@akashic/playlog";
import type { ReftestMessageEvent, ScenarioMessageOption } from "../types/Scenario";

// 既存のtickListの第0tickにログ情報の出力先を指定したMessageEventを付与する
export function injectOutputReceiverUrl(playlogJsonPath: string, url: string): string {
	// シナリオファイルの動的読み込みのため、require の lint エラーを抑止
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const playlogJson = require(playlogJsonPath);
	const tickList: pl.TickList = playlogJson.tickList;
	const option: ScenarioMessageOption = {
		"type": "scenario",
		"command": {
			"name": "init",
			"options": {
				"outputType": "post",
				"outputUrl": url
			}
		}
	};
	const ev: ReftestMessageEvent = [
		pl.EventCode.Message,
		0,
		"engine-files-reftest-player-id",
		option
	];

	const ticksWithEvents = tickList[pl.TickListIndex.Ticks];
	// TODO playlog を編集する機能を切り出したライブラリを作る
	if (!ticksWithEvents || ticksWithEvents.length === 0) {
		// イベントつき tick がない場合: 第 0 tick を追加
		const tick: pl.Tick = [0, [ev]];
		tickList[pl.TickListIndex.Ticks] = [tick];
	} else if (ticksWithEvents[0][pl.TickIndex.Frame] !== 0) {
		// イベント付き tick はあるが第 0 tick がイベントなしの場合: 第 0 tick を追加
		const tick: pl.Tick = [0, [ev]];
		ticksWithEvents.unshift(tick);
	} else {
		// 第0 tick にイベント付き tick がすでに存在する場合: イベントに追加
		const zerothTick = ticksWithEvents[0];
		zerothTick[pl.TickIndex.Events] = (zerothTick[pl.TickIndex.Events] ?? []).concat([ev]);
	}

	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reftest-"));
	const tmpPlaylogJsonPath = path.join(tmpDir, `playlog_${Date.now()}.json`);
	fs.writeFileSync(tmpPlaylogJsonPath, JSON.stringify(playlogJson));

	return tmpPlaylogJsonPath;
}
