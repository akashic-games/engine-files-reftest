import * as puppeteer from "puppeteer";
import type { ExecutionMode } from "../../types/ExecutionMode";
import type { Screenshot } from "../../types/Screenshot";
import { extractDirname } from "../../util/extractDirname";
import { TimeoutError, withTimeLimit } from "../../util/timerUtil";
import { evaluateScenarioByPuppeteer } from "../evaluateScenario";
import type { ReftestOutput, ScenarioRunner } from "../ScenarioRunner";
import type { StaticHost } from "./StaticHost";

const CONTENT_LIMIT_TIME = 300000; // コンテンツ実行時間の上限

interface CreateStaticHostScenarioRunnerParameterObject {
	type: "sandbox" | "export-html";
	hostBin: StaticHost;
}

// このScenarioRunnerはコンテンツをリアルタイムモードでしか実行できないので、modeは必ずpassiveとなる
export async function createStaticHostScenarioRunner(param: CreateStaticHostScenarioRunnerParameterObject): Promise<ScenarioRunner> {
	return {
		run: async (
			contentDirPath: string,
			scenarioPath: string,
			mode: ExecutionMode,
			playTimes: number
		): Promise<ReftestOutput> => {
			if (mode === "replay")
				return { status: "skipped-unsupported", screenshots: [] };

			const screenshots: Screenshot[] = [];
			const serveProcess = await param.hostBin.start({ contentDirPath, hostname: "localhost" });
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
						console.log("StaticHostScenarioRunner: ", msg.text().trimEnd());
					});
					await page.goto(serveProcess.url);
					// 稀に終了メッセージを流す前にコンテンツが終了することがあるため、コンテンツが確実に終了している時間を経過したら強制的に待機を解除する処理を用意した
					await withTimeLimit(CONTENT_LIMIT_TIME, "content did not end in time", () => {
						// この時点で、page は代入済みのはず
						return evaluateScenarioByPuppeteer(page!, scenarioPath, (s: Screenshot) => {
							screenshots.push({
								fileName: `try${playCount}_${s.fileName}`,
								base64: s.base64
							});
						}, serveProcess.canvasSelector);
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
				serveProcess.stop();
			}
			return { status: "succeeded", screenshots };
		},
		dispose: async (): Promise<void> => {
			// do nothing
		},
		getVersionInfo: (): string => {
			return param.hostBin.getVersionInfo();
		}
	};
}
