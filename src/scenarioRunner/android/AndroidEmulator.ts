import type { ChildProcess } from "child_process";
import { execSync, exec } from "child_process";
import * as os from "os";
import { untilResolve, withTimeLimit } from "../../util/timerUtil";

const TIMEOUT = 30000;

export class AndroidEmulatorProcess {
	protected _process: ChildProcess;

	constructor(process: ChildProcess) {
		this._process = process;
	}

	stop(): void {
		this._process.kill();
	}

	getVersionInfo(): string {
		const infoStrs = execSync("emulator -version").toString().split("\n");
		return infoStrs[0];
	}
}

interface AndroidEmulatorParameterObject {
	emulatorName?: string;
}

export async function createAndroidEmulator(param: AndroidEmulatorParameterObject): Promise<AndroidEmulatorProcess> {
	let emulatorName = param.emulatorName;
	const emulators = execSync("emulator -list-avds").toString().split(os.EOL).filter(name => name !== "");
	console.log("createAndroidEmulator", emulatorName, emulators);
	if (!emulatorName) {
		// emulatorが指定されていない時は最初に作られたemulatorをそのまま利用する
		if (emulators.length < 1) {
			throw new Error("not found android emulator, please create android virtual device.");
		}
		emulatorName = emulators[0];
	} else if (emulators.indexOf(emulatorName) === -1) {
		throw new Error(`not found ${emulatorName}, please specify exist emulator name.`);
	}
	// emulatorはバックグラウンドで起動したままにしておくため非同期で実行する
	const process = exec(`emulator -avd ${emulatorName} -no-window`);
	// emulatorが起動するのを待つ
	const checkStarting = async (resolve: (value?: unknown) => void, reject: (err?: Error) => void): Promise<void> => {
		// emulatorが起動していることを確認
		const emulatorsInfo = execSync("adb devices").toString().split(os.EOL).filter(name => name !== "");
		console.log("emulatorsInfo", emulatorsInfo);
		// emulatorが無くても「List of devices attached」という文字列だけは表示されるので要素数が2以上の時をemulatorが存在すると判定
		if (emulatorsInfo.length < 2) {
			reject(new Error("not found emulators"));
			return;
		}
		const emulatorInfo = emulatorsInfo[1].split(/[\s\t]+/);
		// emulatorが利用可能になっているかの確認。利用可能な時の状態がdeviceとなる
		if (emulatorInfo.length !== 2 || emulatorInfo[1] !== "device") {
			reject(new Error(`${emulatorInfo[0]} is not active`));
			return;
		}
		resolve();
	};
	await withTimeLimit(TIMEOUT, "android emulator can't start", () => untilResolve(() => new Promise(checkStarting), 500));
	const testCommand = execSync("adb pull /system/etc/hosts");
	console.log("adb pull /system/etc/hosts", testCommand);
	return new AndroidEmulatorProcess(process);
}
