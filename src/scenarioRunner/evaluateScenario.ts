import * as fs from "fs";
import * as pl from "@akashic/playlog";
import type * as puppeteer from "puppeteer";
import type * as wdio from "webdriverio";
import type { Screenshot } from "../types/Screenshot";

export async function evaluateScenarioByPuppeteer(
	page: puppeteer.Page,
	playlogJsonPath: string,
	takeScreenshotFunc?: (s: Screenshot) => void,
	selector: string = "canvas"
): Promise<void> {
	await page.waitForSelector(selector);
	// canvas 要素が存在する環境で実行する前提なので、! を付与する
	const canvasHandle = (await page.$(selector))!;
	const contentRect = (await canvasHandle.boundingBox())!;
	await evaluateScenario(
		playlogJsonPath,
		{
			pointDown: async (x: number, y: number) => {
				if (page.isClosed()) return;  // タイムアウト時に page はクローズされるため evaluateScenario が実行中の場合に page を利用するとエラーとなる
				await page.mouse.move(contentRect.x + x, contentRect.y + y);
				await page.mouse.down();
			},
			pointMove: async (x: number, y: number) => {
				if (page.isClosed()) return;
				await page.mouse.move(contentRect.x + x, contentRect.y + y);
			},
			pointUp: async (_x: number, _y: number) => {
				if (page.isClosed()) return;
				await page.mouse.up();
			},
			takeScreenshot: async (fileName: string) => {
				if (takeScreenshotFunc && !page.isClosed()) {
					console.log("takeScreenshot", fileName);
					const base64 = await page.screenshot({ clip: contentRect, encoding: "base64" });
					takeScreenshotFunc({ fileName, base64 });
				}
			}
		}
	);
}

export async function evaluateScenarioByAppium(
	client: wdio.BrowserObject,
	playlogJsonPath: string,
	gameJsonPath: string,
	takeScreenshotFunc?: (s: Screenshot) => void
): Promise<void> {
	const gameView = await client.$("id:gameview");
	await gameView.waitForDisplayed();
	// TODO: ゲームコンテンツの縦横比によってコンテンツの表示位置が変わるので対応できるようにする必要がある、またコンテンツは拡縮されているため座標もその拡縮に合わせる必要がある
	const gameViewRect = await gameView.getWindowRect();
	// game.jsonの動的読み込みのため、require の lint エラーを抑止
	/* eslint-disable @typescript-eslint/no-var-requires */
	const gameJson = require(gameJsonPath);
	const gameSizeRate = gameViewRect.width / gameJson.width;
	await evaluateScenario(
		playlogJsonPath,
		{
			pointDown: async (x: number, y: number) => {
				await gameView.touchAction({action: "press", x: x * gameSizeRate, y: y * gameSizeRate, element: gameView});
			},
			pointMove: async (x: number, y: number) => {
				await gameView.touchAction({action: "moveTo", x: x * gameSizeRate, y: y * gameSizeRate, element: gameView});
			},
			pointUp: async (_x: number, _y: number) => {
				// pressを入れないとreleaseできないので、コンテンツの範囲外をpressする
				await gameView.touchAction([{action: "press", x: 0, y: 1000}, "release"]);
			},
			takeScreenshot: async (fileName: string) => {
				if (takeScreenshotFunc) {
					console.log("takeScreenshot", fileName);
					const base64 = await client.takeElementScreenshot(gameView.elementId);
					takeScreenshotFunc({ fileName, base64 });
				}
			}
		}
	);
}

interface EventHandlers {
	pointDown: (x: number, y: number) => Promise<void>;
	pointMove: (x: number, y: number) => Promise<void>;
	pointUp: (x: number, y: number) => Promise<void>;
	takeScreenshot: (fileName: string) => Promise<void>;
}

// 指定されたplaylogJsonのtickListに書かれている全イベントをそれぞれ指定された時間で実行する
// シナリオデータとして playlog 形式を使っているが、puppeteer などを使って外部から操作するので、時間経過への依存性が非常に低いコンテンツでしか結果が安定しない
export async function evaluateScenario(
	playlogJsonPath: string,
	handlers: EventHandlers
): Promise<void> {
	// requireだとここで書き換えたplaylogの内容が次回呼出し時にも反映されてしまうのでfs.readFileSyncを利用する
	const playlogJson = JSON.parse(fs.readFileSync(playlogJsonPath, "utf-8").toString());
	const tickList: pl.TickList = playlogJson.tickList;
	const fps: number = playlogJson.startPoints[0].data.fps;
	const promises: (Promise<void> | null)[] = [];
	await new Promise<void>(resolve => {
		const ticksWithEvents: pl.Tick[] = tickList[pl.TickListIndex.Ticks] ?? [];
		let pseudoGameAge = 0;
		const timer = setInterval(() => {
			if (ticksWithEvents.length === 0) {
				clearInterval(timer);
				resolve();
				return;
			}
			if (pseudoGameAge === ticksWithEvents[0][pl.TickIndex.Frame]) {
				const tick = ticksWithEvents.shift()!;
				(tick[pl.TickIndex.Events] ?? []).forEach(ev => {
					switch (ev[pl.EventIndex.Code]) {
						case pl.EventCode.Message:
							const data = ev[pl.MessageEventIndex.Data] ?? {};
							if (data.type !== "scenario") return;
							if (data.command.name === "screenshot") promises.push(handlers.takeScreenshot(data.command.options.fileName));
							break;
						case pl.EventCode.PointDown:
							promises.push(
								handlers.pointDown(ev[pl.PointDownEventIndex.X], ev[pl.PointDownEventIndex.Y])
							);
							break;
						case pl.EventCode.PointMove:
							promises.push(
								handlers.pointMove(
									ev[pl.PointMoveEventIndex.X] + ev[pl.PointMoveEventIndex.StartDeltaX],
									ev[pl.PointMoveEventIndex.Y] + ev[pl.PointMoveEventIndex.StartDeltaY]
								)
							);
							break;
						case pl.EventCode.PointUp:
							promises.push(
								handlers.pointUp(
									ev[pl.PointUpEventIndex.X] + ev[pl.PointUpEventIndex.StartDeltaX],
									ev[pl.PointUpEventIndex.Y] + ev[pl.PointUpEventIndex.StartDeltaY]
								)
							);
							break;
					}
				});
			}
			pseudoGameAge++;
		}, 1000 / fps);
	});

	await Promise.all(promises.filter(v => v));
}
