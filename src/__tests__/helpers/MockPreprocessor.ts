import type { Preprocessor } from "../../preprocessor/Preprocessor";

export class MockPreprocessor implements Preprocessor {
	run(contentDirPath: string): Promise<string> {
		return Promise.resolve(contentDirPath);
	}

	dispose(): Promise<void> {
		return Promise.resolve();
	}

	getVersionInfo(): string {
		return "";
	}
}
