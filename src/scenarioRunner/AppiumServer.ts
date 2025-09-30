import type { ChildProcess} from "child_process";
import { exec } from "child_process";
import * as getPort from "get-port";
import fetch from "node-fetch";
import { untilResolve, withTimeLimit } from "../util/timerUtil";

const TIMEOUT = 30000;

export class AppiumServerProcess {
	readonly port: number;
	private _process: ChildProcess;

	constructor(process: ChildProcess, port: number) {
		this._process = process;
		this.port = port;
	}

	stop(): void {
		this._process.kill();
	}
}

export async function createAppiumServer(): Promise<AppiumServerProcess> {
	console.log("start appium server");
	const port = await getPort();
	// appiumを利用するためにappiumサーバーを先に起動しておく必要がある
	// appiumもバックグラウンドで起動したままにしておくため非同期で実行する
	// 最新の2系だと現状のreftestでappiumが動作しないため1系を使う
	const process = exec(`npx --no appium -p ${port}`); // 確実にローカルにインストールされているものを使うため、npx --noを利用
	// appiumが起動するのを待つ
	const checkStarting = async (resolve: (value?: unknown) => void, reject: (err?: Error) => void): Promise<void> => {
		// Appiumが起動していることを確認するためのAPI実行
		// node のバージョンが 18 以降だと appium の hostname のデフォルトが localhost ではなく 127.0.0.1
		// （参考 : https://github.com/webdriverio/webdriverio/issues/8760）
		await fetch(`http://127.0.0.1:${port}/wd/hub/status`).catch(reject);
		resolve();
	};
	await withTimeLimit(TIMEOUT, "appium server can't start", () => untilResolve(() => new Promise(checkStarting), 500));
	return new AppiumServerProcess(process, port);
}
