import * as fs from "fs";
import type * as http from "http";
import * as path from "path";
import * as cors from "cors";
import * as express from "express";
import * as getPort from "get-port";
import * as puppeteer from "puppeteer";
import { untilResolve } from "../util/timerUtil";

export interface AudioWaveformPageHost {
	server: http.Server;
	url: string;
	containerId: string;
}

// 指定されたコンテンツのプレイ動画から音声波形画像を取得する
export async function renderAudioWaveform(host: string, playVideoPath: string): Promise<string> {
	const audioWaveformPage = await createAudioWaveformPageHost(host, playVideoPath);
	const browser = await puppeteer.launch({
		headless: true,
		executablePath: process.env.CHROME_BIN || undefined,
		args: ["--no-sandbox", "--headless", "--disable-gpu", "--disable-dev-shm-usage"]
	});
	try {
		const page = await browser.newPage();
		await page.goto(audioWaveformPage.url + "/audio-waveform", { waitUntil: "networkidle0" });
		// 音声波形画像が描画されるまで待機
		await untilResolve(() => {
			return page.evaluate(() => (window as any).drawnAudioImage).then(ok => ok ? Promise.resolve() : Promise.reject());
		}, 500);
		const clip = await page.evaluate(s => {
			const el = document.querySelector(s);
			const { width, height, top: y, left: x } = el.getBoundingClientRect();
			return { width, height, x, y };
		}, `#${audioWaveformPage.containerId}`);
		const audioImage = await page.screenshot({ clip, encoding: "base64" });
		await page.close();
		return audioImage;
	} finally {
		await browser.close();
		await audioWaveformPage.server.close();
	}
}

// 指定されたコンテンツのプレイ動画の音声波形画像を描画するページをホストする
// このページは、puppeteerで音声波形画像のスクリーンショットを取得することを前提にしている
// TODO: 本来はページをホストするのではなくAPIで音声波形画像を抽出できるようにすべき
export async function createAudioWaveformPageHost(host: string, playVideoPath: string): Promise<AudioWaveformPageHost> {
	const fileName = path.basename(playVideoPath);
	const staticDir = path.dirname(playVideoPath);
	const port = await getPort();
	const url = `http://${host}:${port}`;
	const app = express();
	const containerId = "waveform";
	app.set("view engine", "ejs");
	// emulator上だとlocalhostにサーバーを立てても別ドメイン扱いされるので、corsの制限をなくす
	app.use(cors({ origin: "*" }));
	app.use("/static", express.static(staticDir));
	app.use("/wavesurfer.js", (_req, res) => {
		const src = fs.readFileSync(require.resolve("wavesurfer.js")).toString();
		res.contentType("text/javascript");
		res.send(src);
	});
	app.get("/audio-waveform", (_req, res) => {
		const templatePath = path.resolve(__dirname, "../../templates/audioWaveform.ejs");
		res.render(templatePath, { playVideoPath: `/static/${fileName}`, containerId, waveSurferPath: "/wavesurfer.js" });
	});
	const server = app.listen(port, () => {
		console.log(`Hosting AudioWaveformServer on ${url}`);
	});
	return { server, url, containerId };
}
