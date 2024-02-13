import type { ChildProcess } from "child_process";
import { execSync, spawn } from "child_process";
import * as getPort from "get-port";
import fetch from "node-fetch";
import type { TargetBinaryFile } from "../../targetBinary/TargetBinaryFile";
import { createTargetBinaryFile } from "../../targetBinary/TargetBinaryFile";
import type { TargetBinarySource } from "../../targetBinary/TargetBinarySource";
import { untilResolve } from "../../util/timerUtil";

export class AkashicServeProcess {
	readonly url: string;
	protected _process: ChildProcess;

	constructor(process: ChildProcess, url: string) {
		this._process = process;
		this.url = url;
	}

	stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.log("teardown server.");
			// akashic-cli-serve側でサーバーが閉じられるのを待つ
			this._process.once("exit", (code: number, signal: string) => {
				console.log(`akashic-cli-serve exit.(exit-code: ${code}, signal: ${signal})`);
				if (code === 0 || signal === "SIGTERM") {
					resolve();
				} else {
					reject(new Error(`akashic-cli-serve could not finish normally.(exit-code: ${code}, signal: ${signal})`));
				}
			});
			this._process.kill("SIGTERM");
		});
	}
}

interface StartAkashicServeParameterObject {
	contentDirPath: string;
	hostname?: string;
	options?: string[];
	env?: { [key: string]: string };
}

export class AkashicServe {
	protected _binFile: TargetBinaryFile;
	protected _version: string;

	constructor(binFile: TargetBinaryFile) {
		this._binFile = binFile;
		this._version = execSync(`node ${this._binFile.path} --version`).toString();
	}

	async start(param: StartAkashicServeParameterObject): Promise<AkashicServeProcess> {
		const port = await getPort();
		console.log(`akashic-cli-serve version: ${this._version}`);
		const args = [
			"--unhandled-rejections=strict",
			this._binFile.path,
			"-p",
			port.toString(),
			"--no-open-browser"
		].concat(param.options ?? []);
		const childProcess = spawn("node", args, { cwd: param.contentDirPath, env: { ...process.env, ...param.env } });

		childProcess.stdout.on("data", data => {
			console.log(`akashic-cli-serve stdout: ${data}`);
		});
		childProcess.stderr.on("data", data => {
			console.error(`akashic-cli-serve stderr: ${data}`);
		});
		console.log("setup server. port:" + port);
		await untilResolve(() => fetch(`http://localhost:${port}/api/plays/0`), 500); // serveが起動するのを待つ
		return new AkashicServeProcess(childProcess, `http://${param.hostname ?? "localhost"}:${port}`);
	}

	dispose(): void {
		this._binFile.dispose();
	}

	getVersionInfo(): string {
		return `serve@${this._version}`;
	}
}

export async function createAkashicServe(binSrc: TargetBinarySource): Promise<AkashicServe> {
	const nameInfo = { moduleName: "@akashic/akashic-cli-serve", binName: "akashic-cli-serve" };
	const file = await createTargetBinaryFile(nameInfo, binSrc);
	return new AkashicServe(file);
}
