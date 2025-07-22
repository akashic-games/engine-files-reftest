import { calculateFinishedTime } from "@akashic/amflow-util/lib/calculateFinishedTime";
import * as puppeteer from "puppeteer";
import type { TargetBinarySource } from "../../targetBinary/TargetBinarySource";
import type { ExecutionMode } from "../../types/ExecutionMode";
import type { Screenshot } from "../../types/Screenshot";
import { createWaiter } from "../../util/createWaiter";
import { extractDirname } from "../../util/extractDirname";
import { TimeoutError, withTimeLimit } from "../../util/timerUtil";
import { createContentOutputReceiver } from "../createContentOutputReceiver";
import { evaluateScenarioByPuppeteer } from "../evaluateScenario";
import { injectOutputReceiverUrl } from "../injectOutputReceiverUrl";
import type { ReftestOutput, ScenarioRunner } from "../ScenarioRunner";
import { createAkashicServe } from "./AkashicServe";

// コンテンツ実行時間の上限。テスト時に実行時間がこの長さを超える場合、確実に失敗することに注意が必要
const CONTENT_LIMIT_MAX_TIME = 300000;

export async function createServeScenarioRunner(binSrc: TargetBinarySource): Promise<ScenarioRunner> {
	const serveBin = await createAkashicServe(binSrc);
	return {
		run: async (
			contentDirPath: string,
			scenarioPath: string,
			mode: ExecutionMode,
			playTimes: number
		): Promise<ReftestOutput> => {
			const screenshots: Screenshot[] = [];
			const contentOutputReceiver = await createContentOutputReceiver("localhost");
			const consoleApiUrl = `${contentOutputReceiver.url}/console`;
			const playlogJsonPath = injectOutputReceiverUrl(scenarioPath, consoleApiUrl);
			// reftest実行時のoriginがnullになってしまうため、--cors-allow-originに*を指定している
			// TODO: *ではなくURL指定にする
			const serveOptions = mode === "replay" ? ["--cors-allow-origin", "*", "--debug-playlog", playlogJsonPath] : [];
			const serveProcess = await serveBin.start({ contentDirPath, hostname: "localhost", options: serveOptions });
			const browser = await puppeteer.launch({
				headless: true,
				executablePath: process.env.CHROME_BIN || undefined,
				args: ["--no-sandbox", "--headless", "--disable-gpu", "--disable-dev-shm-usage"]
			});
			const page = await browser.newPage();
			let playCount = 0;
			try {
				// デバッグ用にコンテンツのコンソールログを表示できるように
				page.on("console", msg => {
					console.log("ServeScenarioRunner: ", msg.text().trimEnd());
				});
				/* eslint-disable @typescript-eslint/no-require-imports */
				const playlogJson = require(playlogJsonPath);
				// テスト時間短縮のために、replayモードでserveアクセス時にreplayTargetTimeのクエリパラメータを付与
				const replayTargetTime = calculateFinishedTime(
					playlogJson.tickList,
					playlogJson.startPoints[0].data.fps,
					playlogJson.startPoints[0].timestamp
				);
				const url = mode === "replay" ?
					`${serveProcess.url}/public?playId=0&mode=replay&replayTargetTime=${replayTargetTime}` :
					serveProcess.url;
				await page.goto(url);
				for (; playCount < playTimes; playCount++) {
					const contentWaiter = createWaiter();
					contentOutputReceiver.onScreenshot.add(s => {
						screenshots.push({
							fileName: `try${playCount}_${s.fileName}`,
							base64: s.base64
						});
					});
					contentOutputReceiver.onFinish.add(() => {
						contentWaiter.resolve();
					});
					contentOutputReceiver.onError.add(e => {
						console.error(`Error on ${consoleApiUrl}. detail:`, e);
						contentWaiter.reject(e);
					});
					const expectedTime = replayTargetTime + 5000;
					// 稀に終了メッセージを流す前にコンテンツが終了することがあるため、コンテンツが確実に終了している時間を経過したら強制的に待機を解除する処理を用意した
					await withTimeLimit(Math.min(expectedTime, CONTENT_LIMIT_MAX_TIME), "content did not end in time", () => {
						return mode === "replay" ?
							contentWaiter.promise :
							evaluateScenarioByPuppeteer(page, playlogJsonPath, (s: Screenshot) => {
								contentOutputReceiver.onScreenshot.fire(s);
							});
					});
					contentOutputReceiver.onScreenshot.removeAll();
					contentOutputReceiver.onFinish.removeAll();
					contentOutputReceiver.onError.removeAll();
					// コンテンツの canvas 要素が正常に削除されていることを確認するため、新規Play作成
					await page.waitForSelector(".external-ref_button_new-play");
					await page.click(".external-ref_button_new-play");
					// リプレイ時は最初に作成されたPlayを使い続ける必要があるため、新規Playは使わずに最初のPlayのURLに飛ぶ
					if (mode === "replay") {
						await page.goto(url);
					}
				}
			} catch (e) {
				if (e instanceof TimeoutError) {
					const timeoutImage: Screenshot = {
						fileName: `timeout_try${playCount}_${extractDirname(scenarioPath)}.png`,
						base64: await page.screenshot({ encoding: "base64" })
					};
					return { status: "timeout", timeoutImage };
				} else {
					throw e;
				}
			} finally {
				await page.close();
				await browser.close();
				await serveProcess.stop();
				contentOutputReceiver.server.close();
			}
			return { status: "succeeded", screenshots };
		},
		dispose: async (): Promise<void> => {
			serveBin.dispose();
		},
		getVersionInfo: (): string => {
			return serveBin.getVersionInfo();
		}
	};
}
