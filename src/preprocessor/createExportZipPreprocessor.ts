import { execSync } from "child_process";
import * as os from "os";
import * as path from "path";
import { createTargetBinaryFile } from "../targetBinary/TargetBinaryFile";
import type { TargetBinarySource } from "../targetBinary/TargetBinarySource";
import type { Preprocessor } from "./Preprocessor";

export async function createExportZipPreprocessor(binSrc: TargetBinarySource): Promise<Preprocessor> {
	const exportZipBin = await createTargetBinaryFile(
		{ moduleName: "@akashic/akashic-cli-export", binName: "akashic-cli-export-zip" },
		binSrc
	);
	const version = execSync(`node ${exportZipBin.path} --version`).toString();
	const getVersionInfo = (): string => {
		return `export-zip@${version}`;
	};
	return {
		run: async (contentDirPath: string): Promise<string> => {
			const outputDir = path.join(os.tmpdir(), `exportZipContent_${Date.now()}`);
			const options = ["--hash-filename", "--force", "--target-service nicolive"];
			console.log(`akashic-cli-export-zip version: ${version}`);
			execSync(
				`cd ${contentDirPath} && ` +
				`node --unhandled-rejections=strict ${exportZipBin.path} -o ${outputDir} ${options.join(" ")}`
			);
			return outputDir;
		},
		dispose: async (): Promise<void> => {
			exportZipBin.dispose();
		},
		getVersionInfo: (): string => {
			return getVersionInfo();
		}
	};
}