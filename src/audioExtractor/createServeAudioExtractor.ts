import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { Readable } from "stream";
import type { Browser } from "puppeteer";
import { createContentOutputReceiver } from "../scenarioRunner/createContentOutputReceiver";
import { evaluateScenarioByPuppeteer } from "../scenarioRunner/evaluateScenario";
import { injectOutputReceiverUrl } from "../scenarioRunner/injectOutputReceiverUrl";
import { createAkashicServe } from "../scenarioRunner/serve/AkashicServe";
import type { TargetBinarySource } from "../targetBinary/TargetBinarySource";
import type { ExecutionMode } from "../types/ExecutionMode";
import type { Screenshot } from "../types/Screenshot";
import { createWaiter } from "../util/createWaiter";
import { withTimeLimit } from "../util/timerUtil";
import type { AudioExtractor} from "./AudioExtractor";
import { AUDIO_IMAGE_FILE_NAME } from "./AudioExtractor";
import { renderAudioWaveform } from "./renderAudioWaveform";

const CONTENT_LIMIT_TIME = 300000; // コンテンツ実行時間の上限

export async function createServeAudioExtractor(binSrc: TargetBinarySource): Promise<AudioExtractor> {
	/* eslint-disable @typescript-eslint/no-require-imports */
	const ps = require("puppeteer-stream");
	const serveBin = await createAkashicServe(binSrc);
	return {
		run: async (
			contentDirPath: string,
			scenarioPath: string,
			mode: ExecutionMode
		): Promise<Screenshot> => {
			// ゲームの実行記録がplaylogと命名されているので、それに合わせてゲームの実行動画をplayVideoと命名
			const playVideoPath = path.join(os.tmpdir(), "playvideo.webm");
			const contentOutputReceiver = await createContentOutputReceiver("localhost");
			const consoleApiUrl = `${contentOutputReceiver.url}/console`;
			const playlogJsonPath = injectOutputReceiverUrl(scenarioPath, consoleApiUrl);
			// reftest実行時のoriginがnullになってしまうため、--cors-allow-originに*を指定している
			// TODO: *ではなくURL指定にする
			const serveOptions = mode === "replay"
				? ["--cors-allow-origin", "*", "--debug-playlog", playlogJsonPath]
				: ["--debug-pause-active"];
			const serveProcess = await serveBin.start({ contentDirPath, hostname: "localhost", options: serveOptions });
			const browser: Browser = await ps.launch({ // TODO puppeteer-stream 側に型をつけるべき。現状型がないので puppeteer の Browser で代用している
				defaultViewport: {
					width: 1280,
					height: 720
				},
				headless: true,
				ignoreDefaultArgs: [
					"--mute-audio",
				],
				executablePath: process.env.CHROME_BIN || null,
				args: [
					"--autoplay-policy=no-user-gesture-required",
					"--headless=chrome",
					"--no-sandbox",
					"--disable-gpu",
					"--disable-dev-shm-usage"
				]
			});
			try {
				const page = await browser.newPage();
				// デバッグ用にコンテンツのコンソールログを表示できるように
				page.on("console", msg => {
					console.log("ServeAudioExtractor: ", msg.text().trimEnd());
				});
				const url = mode === "replay" ? `${serveProcess.url}/public?playId=0&mode=replay&paused=1` : `${serveProcess.url}/public`;
				await page.goto(url, { waitUntil: "networkidle0" });
				// 音声ありで動画取得
				const stream: Readable = await ps.getStream(page, { audio: true, video: false }); // TODO puppeteer-stream 側に型をつけるべき
				const file = fs.createWriteStream(playVideoPath);
				stream.pipe(file);
				const contentWaiter = createWaiter();

				contentOutputReceiver.onFinish.add(() => {
					contentWaiter.resolve();
				});
				contentOutputReceiver.onError.add(e => {
					console.error(`Error on ${consoleApiUrl}. detail:`, e);
					contentWaiter.reject(e);
				});

				if (mode === "replay") {
					// ?paused=1 で開いたページのポーズを解除する
					// TODO: akashic-cli-serve@1.15.9 未満を非サポートとしてエラーにする。(?paused=1 をサポートしていないのでここで(ポーズ解除でなく)ポーズする)
					await page.waitForSelector(".external-ref_button_pause");
					await page.click(".external-ref_button_pause");
				} else {
					// --debug-pause-activeモード で開いたページのポーズを解除する
					// TODO: akashic-cli-serve@1.15.12 未満を非サポートとしてエラーにする。
					await page.waitForSelector(".external-ref_button_active-pause");
					await page.click(".external-ref_button_active-pause");
				}

				// コンテンツが確実に終了している時間を経過したら強制的に打ち切る
				await withTimeLimit(CONTENT_LIMIT_TIME, "content did not end in time", () => {
					return mode === "replay" ?
						contentWaiter.promise :
						evaluateScenarioByPuppeteer(page, playlogJsonPath);
				});
				await stream.destroy();
				file.close();
				await page.close();
			} finally {
				await browser.close();
				await serveProcess.stop();
				contentOutputReceiver.server.close();
			}
			const audioImage = await renderAudioWaveform("localhost", playVideoPath);
			return { fileName: AUDIO_IMAGE_FILE_NAME, base64: audioImage };
		},

		dispose: async (): Promise<void> => {
			serveBin.dispose();
		},
		finish: async (): Promise<void> => {
			serveBin.finish();
		}
	};
}
