import type * as http from "http";
import { Trigger } from "@akashic/trigger";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import * as getPort from "get-port";
import type { ConsoleApiParameter } from "reftest-helper/lib/types";
import type { Screenshot } from "../types/Screenshot";

export interface ContentOutputReceiver {
	server: http.Server;
	url: string; // scenario に書き込むための URL 情報
	onScreenshot: Trigger<Screenshot>; // consoleAPIでscereenshotのメッセージイベントを受け取った時に発火するイベントハンドラ
	onFinish: Trigger<void>; // consoleAPIでfinishのメッセージイベントを受け取った時に発火するイベントハンドラ
	onError: Trigger<Error>; // consoleAPIでエラーが発生した時に発火するイベントハンドラ
}

// コンテンツからログ情報を受け取るサーバーを作成する
export async function createContentOutputReceiver(host: string): Promise<ContentOutputReceiver> {
	const port = await getPort();
	const url = `http://${host}:${port}`;
	const onScreenshot = new Trigger<Screenshot>();
	const onFinish = new Trigger<void>();
	const onError = new Trigger<Error>();
	const app = express();
	// emulator上だとlocalhostにサーバーを立てても別ドメイン扱いされるので、corsの制限をなくす
	app.use(cors({ origin: "*" }));
	// 画像データがサイズの大きいbase64の文字列で送られてくるので、bodyのサイズ制限をある程度大きめにする
	app.use(bodyParser.json({limit: "10mb"}));
	// コンテンツがconsoleAPIを叩くことによって、consoleCallback関数経由でreftest側にもログ情報が送られることになる
	app.post("/console", (req, res, next) => {
		try {
			const parameter: ConsoleApiParameter = req.body;
			switch (parameter.commandName) {
				case "screenshot":
					if (!parameter.screenshotData) return;
					onScreenshot.fire({
						fileName: parameter.screenshotData.fileName,
						base64: parameter.screenshotData.base64
					});
					break;
				case "finish":
					onFinish.fire();
					break;
			}
			res.status(200).json({meta: {status: 200}});
		} catch (e) {
			if (e instanceof Error) {
				onError.fire(e);
			}
			next(e);
		}
	});
	const server = app.listen(port, () => {
		console.log(`Hosting ScreeshotServer on ${url}`);
	});
	return { server, url, onScreenshot, onFinish, onError };
}
