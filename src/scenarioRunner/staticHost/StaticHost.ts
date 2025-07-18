export interface StaticHostProcess {
	readonly url: string;
	readonly canvasSelector: string;
	stop(): void;
}

export interface StaticHostParameterObject {
	contentDirPath: string;
	hostname?: string;
}

export interface StaticHost {
	start(param: StaticHostParameterObject): Promise<StaticHostProcess>;
	getVersionInfo(): string;
	dispose(): void;
	finish(): void;
}
