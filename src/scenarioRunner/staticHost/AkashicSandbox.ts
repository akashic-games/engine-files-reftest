import type { ChildProcess } from "child_process";
import { spawn } from "child_process";
import * as getPort from "get-port";
import fetch from "node-fetch";
import type { TargetBinaryFile } from "../../targetBinary/TargetBinaryFile";
import { createTargetBinaryFile } from "../../targetBinary/TargetBinaryFile";
import type { TargetBinarySource } from "../../targetBinary/TargetBinarySource";
import { execCommand } from "../../util/execCommand";
import { untilResolve } from "../../util/timerUtil";
import type { StaticHost, StaticHostParameterObject, StaticHostProcess } from "./StaticHost";

export class AkashicSandboxProcess implements StaticHostProcess {
	readonly url: string;
	// v3 では input-handler がない。しかしそれとは別に、serve ベースの sandbox は (デフォルトでは) canvas は一つしかないので、そこから辿る。ただしこれは暫定対応
	// readonly canvasSelector: string = ".input-handler > canvas";
	readonly canvasSelector: string = "#container > div > canvas";
	protected _process: ChildProcess;

	constructor(process: ChildProcess, url: string) {
		this._process = process;
		this.url = url;
	}

	stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.log("teardown server.");
			// akashic-(cli-)sandbox側でサーバーが閉じられるのを待つ
			this._process.once("exit", (code: number, signal: string) => {
				console.log(`akashic-(cli-)sandbox exit.(exit-code: ${code}, signal: ${signal})`);
				if (code === 0 || signal === "SIGTERM") {
					resolve();
				} else {
					reject(new Error(`akashic-(cli-)sandbox could not finish normally.(exit-code: ${code}, signal: ${signal})`));
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
		this._version = execCommand(`node ${this._binFile.path} --version`);
	}

	async start(param: StaticHostParameterObject): Promise<AkashicSandboxProcess> {
		if (param.hostname !== "localhost")
			throw new Error("AkashicSandbox#start(): NOT IMPLEMENTED hostname " + param.hostname);

		const port = await getPort();
		console.log(`akashic-(cli-)sandbox version: ${this._version}`);
		const args = ["--unhandled-rejections=strict", this._binFile.path, "-p", port.toString()];
		const childProcess = spawn("node", args, { cwd: param.contentDirPath });

		childProcess.stdout.on("data", data => {
			console.log(`akashic-(cli-)sandbox stdout: ${data}`);
		});
		childProcess.stderr.on("data", data => {
			console.error(`akashic-(cli-)sandbox stderr: ${data}`);
		});
		console.log("setup server. port:" + port);
		await untilResolve(() => fetch(`http://localhost:${port}/engine`), 500); // 起動するのを待つ
		return new AkashicSandboxProcess(childProcess, `http://${param.hostname ?? "localhost"}:${port}/game/`);
	}

	dispose(): void {
		this._binFile.dispose();
		console.log("finish to uninstall @akashic/akashic-(cli-)sandbox");
	}

	getVersionInfo(): string {
		return `sandbox@${this._version}`;
	}
}

export async function createAkashicSandbox(binSrc: TargetBinarySource): Promise<AkashicSandbox> {
	// 後方互換対応: v1 系以降 akashic-cli に統合されて名前が変わっている
	const nameInfo = (binSrc.type === "published" && binSrc.version?.startsWith("0.")) ?
		{ moduleName: "@akashic/akashic-sandbox", binName: "akashic-sandbox" } :
		{ moduleName: "@akashic/akashic-cli-sandbox", binName: "akashic-cli-sandbox" };

	const file = await createTargetBinaryFile(nameInfo, binSrc);
	return new AkashicSandbox(file);
}
