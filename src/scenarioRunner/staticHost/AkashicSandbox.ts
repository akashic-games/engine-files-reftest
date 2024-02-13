import type { ChildProcess } from "child_process";
import { execSync, spawn } from "child_process";
import * as getPort from "get-port";
import fetch from "node-fetch";
import type { TargetBinaryFile } from "../../targetBinary/TargetBinaryFile";
import { createTargetBinaryFile } from "../../targetBinary/TargetBinaryFile";
import type { TargetBinarySource } from "../../targetBinary/TargetBinarySource";
import { untilResolve } from "../../util/timerUtil";
import type { StaticHost, StaticHostParameterObject, StaticHostProcess } from "./StaticHost";

export class AkashicSandboxProcess implements StaticHostProcess {
	readonly url: string;
	readonly canvasSelector: string = ".input-handler > canvas";
	protected _process: ChildProcess;

	constructor(process: ChildProcess, url: string) {
		this._process = process;
		this.url = url;
	}

	stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.log("teardown server.");
			// akashic-sandbox側でサーバーが閉じられるのを待つ
			this._process.once("exit", (code: number, signal: string) => {
				console.log(`akashic-sandbox exit.(exit-code: ${code}, signal: ${signal})`);
				if (code === 0 || signal === "SIGTERM") {
					resolve();
				} else {
					reject(new Error(`akashic-sandbox could not finish normally.(exit-code: ${code}, signal: ${signal})`));
				}
			});
			this._process.kill("SIGTERM");
		});
	}
}

export class AkashicSandbox implements StaticHost {
	protected _binFile: TargetBinaryFile;
	protected _version: string;

	constructor(binFile: TargetBinaryFile) {
		this._binFile = binFile;
		this._version = execSync(`node ${this._binFile.path} --version`).toString();
	}

	async start(param: StaticHostParameterObject): Promise<AkashicSandboxProcess> {
		if (param.hostname !== "localhost")
			throw new Error("AkashicSandbox#start(): NOT IMPLEMENTED hostname " + param.hostname);

		const port = await getPort();
		console.log(`akashic-sandbox version: ${this._version}`);
		const args = ["--unhandled-rejections=strict", this._binFile.path, "-p", port.toString()];
		const childProcess = spawn("node", args, { cwd: param.contentDirPath });

		childProcess.stdout.on("data", data => {
			console.log(`akashic-sandbox stdout: ${data}`);
		});
		childProcess.stderr.on("data", data => {
			console.error(`akashic-sandbox stderr: ${data}`);
		});
		console.log("setup server. port:" + port);
		await untilResolve(() => fetch(`http://localhost:${port}/engine`), 500); // 起動するのを待つ
		return new AkashicSandboxProcess(childProcess, `http://${param.hostname ?? "localhost"}:${port}/game/`);
	}

	dispose(): void {
		this._binFile.dispose();
		console.log("finish to uninstall @akashic/akashic-sandbox");
	}

	getVersionInfo(): string {
		return `sandbox@${this._version}`;
	}
}

export async function createAkashicSandbox(binSrc: TargetBinarySource): Promise<AkashicSandbox> {
	const nameInfo = { moduleName: "@akashic/akashic-sandbox", binName: "akashic-sandbox" };
	const file = await createTargetBinaryFile(nameInfo, binSrc);
	return new AkashicSandbox(file);
}
