import { execSync } from "child_process";
import * as path from "path";
import type { TargetBinaryNameInfo } from "./TargetBinaryNameInfo";
import type { TargetBinarySource, TargetBinarySourceLocal, TargetBinarySourcePublished } from "./TargetBinarySource";

/**
 * ターゲットバイナリのファイル実体。
 */
export interface TargetBinaryFile {
	/**
	 * ターゲットバイナリのファイルパス。
	 */
	path: string;

	/**
	 * ターゲットバイナリを破棄する。
	 * e.g. 一時ディレクトリに npm install されたものがあれば uninstall される。
	 */
	dispose(): void;
}

/**
 * ローカルファイルを使うターゲットバイナリ。
 */
class LocalTargetBinaryFile implements TargetBinaryFile {
	path: string;

	constructor(binSrc: TargetBinarySourceLocal) {
		this.path = binSrc.path;
	}

	dispose(): void {
		// do nothing
	}
}

/**
 * publish されたものをインストールして使うターゲットバイナリ。
 */
class PublishedTargetBinaryFile implements TargetBinaryFile {
	path: string;
	protected readonly nameInfo: TargetBinaryNameInfo;
	protected readonly binSrc: TargetBinarySourcePublished;

	constructor(nameInfo: TargetBinaryNameInfo, binSrc: TargetBinarySourcePublished) {
		if (!/^(?:@[\w+_-]+\/)?[\w+_-]+(?:@[\d\w\.-]+)?$/.test(nameInfo.moduleName)) {
			throw new Error(`invalid npm module name: ${nameInfo.moduleName}`);
		}
		this.path = null!;
		this.nameInfo = nameInfo;
		this.binSrc = binSrc;
		withCwdSync(this.binSrc.downloadDirPath, () => {
			execSync(`npm i ${nameInfo.moduleName}@${binSrc.version ?? "latest"}`);
			this.path = path.join(binSrc.downloadDirPath, "node_modules", ".bin", nameInfo.binName);
		});
	}

	dispose(): void {
		// do nothing
	}
}

function withCwdSync<T>(dirpath: string, fun: () => T): T {
	const cwd = process.cwd();
	try {
		process.chdir(dirpath);
		return fun();
	} finally {
		process.chdir(cwd);
	}
}

export async function createTargetBinaryFile(nameInfo: TargetBinaryNameInfo, binSrc: TargetBinarySource): Promise<TargetBinaryFile> {
	switch (binSrc.type) {
		case "local":
			return new LocalTargetBinaryFile(binSrc);
		case "published":
			return new PublishedTargetBinaryFile(nameInfo, binSrc);
	}
}
