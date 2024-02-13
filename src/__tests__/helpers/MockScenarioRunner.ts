import type { ReftestOutput, ScenarioRunner } from "../../scenarioRunner/ScenarioRunner";
import type { ExecutionMode } from "../../types/ExecutionMode";

export class MockScenarionRunner implements ScenarioRunner {
	run(_contentDirPath: string, _scenarioPath: string, _mode: ExecutionMode): Promise<ReftestOutput> {
		return Promise.resolve({ status: "succeeded", screenshots:[] });
	}

	dispose(): Promise<void> {
		return Promise.resolve();
	}

	getVersionInfo(): string {
		return "";
	}
}
