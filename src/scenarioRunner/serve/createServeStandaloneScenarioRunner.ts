import * as fs from "fs";
import * as path from "path";
import * as puppeteer from "puppeteer";
import type { TargetBinarySource } from "../../targetBinary/TargetBinarySource";
import type { ExecutionMode } from "../../types/ExecutionMode";
import type { Screenshot } from "../../types/Screenshot";
import { extractDirname } from "../../util/extractDirname";
import { TimeoutError, withTimeLimit } from "../../util/timerUtil";
import { evaluateScenarioByPuppeteer } from "../evaluateScenario";
import type { ReftestOutput, ScenarioRunner } from "../ScenarioRunner";
import { createAkashicServe } from "./AkashicServe";

// コンテンツ実行時間の上限。テスト時に実行時間がこの長さを超える場合、確実に失敗することに注意が必要
const CONTENT_LIMIT_MAX_TIME = 300000;

interface CreateServeStandaloneScenarioRunnerParameterObject {
	type: "serve-standalone";
	binSrc: TargetBinarySource;
}

export async function createServeStandaloneScenarioRunner(
	param: CreateServeStandaloneScenarioRunnerParameterObject
): Promise<ScenarioRunner> {
	const serveBin = await createAkashicServe(param.binSrc);
	return {
		run: async (
			contentDirPath: string,
			scenarioPath: string,
			mode: ExecutionMode,
			playTimes: number
		): Promise<ReftestOutput> => {
			if (mode === "replay" || Number(serveBin.getVersion().split(".")[0]) < 2) {
				return { status: "skipped-unsupported", screenshots: [] };
			}
			const screenshots: Screenshot[] = [];
			const serveProcess = await serveBin.start({ contentDirPath, hostname: "localhost", options: ["--standalone"] });
			const browser = await puppeteer.launch({
				headless: true,
				executablePath: process.env.CHROME_BIN || undefined,
				args: ["--no-sandbox", "--headless", "--disable-gpu", "--disable-dev-shm-usage"]
			});
			let page: puppeteer.Page | null = null;
			let playCount = 0;
			try {
				for (; playCount < playTimes; playCount++) {
					page = await browser.newPage();
					// デバッグ用にコンテンツのコンソールログを表示できるように
					page.on("console", msg => {
						console.log("ServeStandaloneScenarioRunner: ", msg.text().trimEnd());
					});
					await page.goto(serveProcess.url);
					// 稀に終了メッセージを流す前にコンテンツが終了することがあるため、コンテンツが確実に終了している時間を経過したら強制的に待機を解除する処理を用意した
					await withTimeLimit(CONTENT_LIMIT_MAX_TIME, "content did not end in time", () => {
						// コンテンツのサイズをgame.jsonから取得する
						const gameJson = JSON.parse(fs.readFileSync(path.resolve(contentDirPath, "game.json"), "utf-8"));
						// ウィンドウサイズをコンテンツのサイズとピッタリ同じにすると、ツールバーなどの要素が重なってしまうため、少し余白を持たせる
						const margin = 100;
						const viewport = { width: gameJson.width + margin, height: gameJson.height + margin };
						// この時点で、page は代入済みのはず
						return evaluateScenarioByPuppeteer(
							page!,
							scenarioPath,
							(s: Screenshot) => {
								screenshots.push({
									fileName: `try${playCount}_${s.fileName}`,
									base64: s.base64
								});
							},
							"canvas",
							viewport
						);
					});
					await page.close();
				}
			} catch (e) {
				// TODO: この辺りのエラーハンドリングは他のScenarioRunnerとほぼ同じコードになっているので、「シナリオを実行してエラー時にスクリーンショットを撮る」一連の流れを共通化すべき
				if (e instanceof TimeoutError) {
					const screenshot: Screenshot = {
						fileName: `${param.type}_timeout_try${playCount}_${extractDirname(scenarioPath)}.png`,
						base64: await page!.screenshot({ encoding: "base64" }) // TimeoutError は withTimeLimit() から来るので、page は代入済みのはず
					};
					return { status: "timeout", screenshot };
				} else {
					if (page && !page.isClosed()) {
						const screenshot: Screenshot = {
							fileName: `${param.type}_error_try${playCount}_${extractDirname(scenarioPath)}.png`,
							base64: await page.screenshot({ encoding: "base64" })
						};
						return { status: "error", screenshot, error: e };
					}
					throw e;
				}
			} finally {
				if (page && !page.isClosed()) await page.close();
				await browser.close();
				await serveProcess.stop();
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
