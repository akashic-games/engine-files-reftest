import * as fs from "fs";
import * as path from "path";
import { execCommand } from "../util/execCommand";
import { initializeNpmDir } from "../util/initializeNpmDir";
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

	/**
	 * 終了通知
	 */
	finish(): void;
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
	finish(): void {
		// do nothing
	}
}

/**
 * publish されたものをインストールして使うターゲットバイナリ。
 */
class PublishedTargetBinaryFile implements TargetBinaryFile {
	path: string;
	downloadDir: string;
	npmCacheDir: string;
	protected readonly nameInfo: TargetBinaryNameInfo;
	protected readonly binSrc: TargetBinarySourcePublished;

	constructor(nameInfo: TargetBinaryNameInfo, binSrc: TargetBinarySourcePublished) {
		if (!/^(?:@[\w+_-]+\/)?[\w+_-]+(?:@[\d\w\.-]+)?$/.test(nameInfo.moduleName)) {
			throw new Error(`invalid npm module name: ${nameInfo.moduleName}`);
		}
		this.path = null!;
		this.nameInfo = nameInfo;
		this.binSrc = binSrc;
		let version = binSrc.version;

		if (version === "latest") {
			version = execCommand(`npm info ${nameInfo.moduleName} version`).trim();
		}
		this.downloadDir = path.join(binSrc.downloadDirPath, version);
		this.npmCacheDir = path.join(binSrc.npmCacheDir, version);
		const targetDir = this.binSrc.useNpmCache && fs.existsSync(this.npmCacheDir) ? this.npmCacheDir : this.downloadDir;
		if (
			this.binSrc.useNpmCache && !fs.existsSync(this.npmCacheDir) && !fs.existsSync(this.downloadDir)
			|| !this.binSrc.useNpmCache && !fs.existsSync(this.downloadDir)
		) {
			initializeNpmDir(targetDir);
			withCwdSync(targetDir, () => {
				execCommand(`npm i ${nameInfo.moduleName}@${binSrc.version}`);
				this.path = path.join(targetDir, "node_modules", ".bin", nameInfo.binName);
			});
		} else {
			this.path = path.join(targetDir, "node_modules", ".bin", nameInfo.binName);
		}
	}

	dispose(): void {
		if (this.binSrc.type === "published" && !this.binSrc.useNpmCache) {
			if (fs.existsSync(this.binSrc.downloadDirPath)) {
				fs.rmdirSync(this.binSrc.downloadDirPath, { recursive: true });
			}
		}
	}

	finish(): void {
		if (this.binSrc.useNpmCache) {
			if (!fs.existsSync(this.npmCacheDir)) {
				fs.mkdirSync(this.npmCacheDir, { recursive: true });
				fs.renameSync(this.downloadDir, this.npmCacheDir);
			}
		}
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
