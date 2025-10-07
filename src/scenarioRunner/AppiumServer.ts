import type { ChildProcess} from "child_process";
import { exec } from "child_process";
import * as path from "path";
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
	// appium は v1 系でなければならないことに注意。(v2 系には対応できていないことがわかっている)
	const appiumBinPath = require.resolve("appium");
	console.log("appium bin path: " + appiumBinPath);
	const process = exec(`${appiumBinPath} -p ${port}`,
		(error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			if (stdout) console.log(`stdout: ${stdout}`);
			if (stderr) console.log(`stderr: ${stderr}`);
		}
	); // 確実にローカルにインストールされているものを使うため、npx --noを利用
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
