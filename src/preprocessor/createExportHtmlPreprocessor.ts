import * as os from "os";
import * as path from "path";
import { createTargetBinaryFile } from "../targetBinary/TargetBinaryFile";
import type { TargetBinarySource } from "../targetBinary/TargetBinarySource";
import { execCommand } from "../util/execCommand";
import type { Preprocessor } from "./Preprocessor";

export async function createExportHtmlPreprocessor(binSrc: TargetBinarySource): Promise<Preprocessor> {
	const exportHtmlBin = await createTargetBinaryFile(
		{ moduleName: "@akashic/akashic-cli-export", binName: "akashic-cli-export-html" },
		binSrc
	);
	const version = execCommand(`node ${exportHtmlBin.path} --version`);
	const getVersionInfo = (): string => {
		return `export-html@${version}`;
	};
	return {
		run: async (contentDirPath: string): Promise<string> => {
			const outputDir = path.join(os.tmpdir(), `exportHtmlContent_${Date.now()}`);
			console.log(`akashic-cli-export-html version: ${version}`);
			execCommand(`cd ${contentDirPath} && node --unhandled-rejections=strict ${exportHtmlBin.path} -o ${outputDir} --force`);
			return outputDir;
		},
		dispose: async (): Promise<void> => {
			exportHtmlBin.dispose();
		},
		getVersionInfo: (): string => {
			return getVersionInfo();
		}
	};
}
