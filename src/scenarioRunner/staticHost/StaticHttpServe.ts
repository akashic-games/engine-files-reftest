import * as http from "http";
import * as getPort from "get-port";
import type { StaticHost, StaticHostParameterObject, StaticHostProcess } from "./StaticHost";

// @types/serve-handlerを利用するためにはesModuleInteropを有効にする必要があるが、その場合他箇所のビルドにも影響が出るためrequireを使用
/* eslint-disable @typescript-eslint/no-require-imports */
const handler = require("serve-handler");

export class StaticHttpServeProcess implements StaticHostProcess {
	readonly url: string;
	readonly canvasSelector: string = "canvas";
	protected _server: http.Server;

	constructor(server: http.Server, url: string) {
		this._server = server;
		this.url = url;
	}

	stop(): void {
		this._server.close();
	}
}

export class StaticHttpServe implements StaticHost {
	async start(param: StaticHostParameterObject): Promise<StaticHttpServeProcess> {
		const host = param.hostname ?? "localhost";
		const port = await getPort();
		const server = http.createServer((request, response) => {
			handler(request, response, {
				public: param.contentDirPath,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Credentials": "true"
				}
			});
		});
		server.listen(port);
		console.log("setup server. port:" + port);
		return new StaticHttpServeProcess(server, `http://${host}:${port}`);
	}

	getVersionInfo(): string {
		return "http-server";
	}
	dispose(): void {
		// do nothing
	}
	finish(): void {
		// do nothing
	}
}

export async function createStaticHttpServe(): Promise<StaticHttpServe> {
	return new StaticHttpServe();
}
