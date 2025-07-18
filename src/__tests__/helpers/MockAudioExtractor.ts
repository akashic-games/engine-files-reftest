import type { AudioExtractor } from "../../audioExtractor/AudioExtractor";
import type { ExecutionMode } from "../../types/ExecutionMode";
import type { Screenshot } from "../../types/Screenshot";

export class MockAudioExtractor implements AudioExtractor {
	run(
		_contentDirPath: string,
		_scenarioPath: string,
		_mode: ExecutionMode
	): Promise<Screenshot> {
		return Promise.resolve({ fileName: "mock.png", base64: "" });
	}

	dispose(): Promise<void> {
		return Promise.resolve();
	}

	finish(): Promise<void> {
		return Promise.resolve();
	}
}
