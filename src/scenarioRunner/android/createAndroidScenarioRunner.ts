import * as fs from "fs";
import * as path from "path";
import * as wdio from "webdriverio";
import type { TargetBinarySource } from "../../targetBinary/TargetBinarySource";
import type { ExecutionMode } from "../../types/ExecutionMode";
import type { Screenshot } from "../../types/Screenshot";
import { createWaiter } from "../../util/createWaiter";
import { withTimeLimit } from "../../util/timerUtil";
import { createAppiumServer } from "../AppiumServer";
import { createContentOutputReceiver } from "../createContentOutputReceiver";
import { evaluateScenarioByAppium } from "../evaluateScenario";
import { injectOutputReceiverUrl } from "../injectOutputReceiverUrl";
import type { ReftestOutput, ScenarioRunner } from "../ScenarioRunner";
import { createAkashicServe } from "../serve/AkashicServe";
import { createAndroidEmulator } from "./AndroidEmulator";

const CONTENT_LIMIT_TIME = 300000; // コンテンツ実行時間の上限
const ANDROID_ELEMENT_TIMEOUT = 10000; // Androidエミュレータの要素取得タイムアウト

interface CreateAndroidScenarioRunnerParameterObject {
	serveBinSrc: TargetBinarySource;
	apkPath: string;
	playlogClientPath: string;
	emulatorName: string | null;
	appPackage: string | null;
	appActivity: string | null;
}

export async function createAndroidScenarioRunner(param: CreateAndroidScenarioRunnerParameterObject): Promise<ScenarioRunner> {
	const emulatorProcess = await createAndroidEmulator({emulatorName: param.emulatorName});
	const appiumProcess = await createAppiumServer();
	const serveBin = await createAkashicServe(param.serveBinSrc);
	return {
		run: async (
			contentDirPath: string,
			scenarioPath: string,
			mode: ExecutionMode,
			playTimes: number
		): Promise<ReftestOutput> => {
			const gameJson = JSON.parse(fs.readFileSync(path.resolve(contentDirPath, "game.json")).toString());
			// v1コンテンツは画像アセットのhint.untaintedをサポートしておらず、別ホストで起動しているコンテンツのスクリーンショット画像を取得できないためスキップする
			if (!gameJson.environment
				|| !gameJson.environment["sandbox-runtime"]
				|| gameJson.environment["sandbox-runtime"] === "1"
			) {
				return { status: "skipped-unsupported", screenshots: [] };
			}
			const screenshots: Screenshot[] = [];
			// androidエミュレータ上では localhost は 10.0.2.2 になるので、hostとしてlocalhostの代わりに10.0.2.2を指定
			const localhostIp = "10.0.2.2";
			const contentOutputReceiver = await createContentOutputReceiver(localhostIp);
			const consoleApiUrl = `${contentOutputReceiver.url}/console`;
			const playlogJsonPath = injectOutputReceiverUrl(scenarioPath, consoleApiUrl);
			// reftest実行時のoriginがnullになってしまうため、--cors-allow-originに*を指定している
			// TODO: *ではなくURL指定にする
			const serveOptions = mode === "replay" ?
				["--cors-allow-origin", "*", "--debug-playlog", playlogJsonPath] :
				["--cors-allow-origin", "*"];
			const serveProcess = await serveBin.start({
				contentDirPath,
				hostname: localhostIp,
				options: serveOptions,
				env: { "PLAYLOG_CLIENT_PATH": param.playlogClientPath }
			});
			const client = await wdio.remote({
				hostname: "127.0.0.1",
				path: "/wd/hub",
				port: appiumProcess.port,
				capabilities: {
					platformName: "Android",
					deviceName: "Android Emulator",
					app: param.apkPath,
					isHeadless: true,
					automationName: "UiAutomator2",
					// appPackageとappActivityは、テスト用アプリのマニフェストファイル(AndroidManifest.xml)に書かれている値を記載
					appPackage: param.appPackage ?? undefined,
					appActivity: param.appActivity ?? undefined
				}
			});
			try {
				if (mode === "replay") {
					const modeButton = await client.$("id:active");
					await assertDisplayed(modeButton, "mode button(id:active) is not displayed");
					await modeButton.click();
				}
				for (let playCount = 0; playCount < playTimes; playCount++) {
					const contentWaiter = createWaiter();
					contentOutputReceiver.onScreenshot.add(s => {
						screenshots.push({
							fileName: `try${playCount}_${s.fileName}`,
							base64: s.base64
						});
					});
					contentOutputReceiver.onFinish.add(() => contentWaiter.resolve());
					contentOutputReceiver.onError.add(e => {
						console.error(`Error on ${consoleApiUrl}. detail:`, e);
						contentWaiter.reject(e);
					});
					// passiveモードでコンテンツを起動するための処理
					const urlField = await client.$("id:url");
					await assertDisplayed(urlField, "url field(id:url) is not displayed");
					await urlField.setValue(`${serveProcess.url}/contents/0/content.raw.json`);
					const button = await client.$("id:connect");
					await assertDisplayed(button, "connect button(id:connect) is not displayed");
					await button.click();
					// コンテンツにエラーが発生した場合、コンテンツは止まってしまってcontentWaiterも解除できないので、制限時間を設けておく
					await withTimeLimit(CONTENT_LIMIT_TIME, "content did not end in time", () => {
						return mode === "replay" ?
							contentWaiter.promise :
							evaluateScenarioByAppium(
								client,
								playlogJsonPath,
								path.resolve(contentDirPath, "game.json"),
								(s: Screenshot) => contentOutputReceiver.onScreenshot.fire(s)
							);
					});
					contentOutputReceiver.onScreenshot.removeAll();
					contentOutputReceiver.onFinish.removeAll();
					contentOutputReceiver.onError.removeAll();

					// Playのリセット。Playが1つだけ起動していることの確認も兼ねて「STOP 1 GAME」ボタンのみ実行
					const stopButton = await client.$("id:stop");
					await assertDisplayed(stopButton, "stop button(id:stop) is not displayed");
					await stopButton.click();
				}
				await client.deleteSession();
			} finally {
				await serveProcess.stop();
				contentOutputReceiver.server.close();
			}
			return { status: "succeeded", screenshots };
		},
		dispose: async (): Promise<void> => {
			emulatorProcess.stop();
			appiumProcess.stop();
			serveBin.dispose();
		},
		getVersionInfo: (): string => {
			return serveBin.getVersionInfo() + ", " + emulatorProcess.getVersionInfo();
		}
	};
}

// 指定した要素の表示を確認する、表示されていない場合はエラーメッセージを出力してエラーを投げる
async function assertDisplayed(element: wdio.Element, errorMessage: string): Promise<void> {
	// 表示に時間がかかる場合があるため、waitForDisplayedを使用して表示されるまで待機する
	if (!await element.waitForDisplayed({ timeout: ANDROID_ELEMENT_TIMEOUT })) {
		console.error(errorMessage);
		throw new Error(errorMessage);
	}
}
