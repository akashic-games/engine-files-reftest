import type * as pl from "@akashic/playlog";
import type { InitCommandOption, ScreenshotData } from "reftest-helper/lib/types";

export type Scenario = PlaylogScenario;

export interface PlaylogScenario {
	type: "playlog";
	path: string;
}

export interface InitCommand {
	name: "init";
	options: InitCommandOption;
}

export interface ScreenshotCommand {
	name: "screenshot";
	options: ScreenshotData;
}

export interface FinishCommand {
	name: "finish";
}

export interface ScenarioMessageOption {
	type: "scenario";
	command: InitCommand | ScreenshotCommand | FinishCommand;
}

export interface ReftestMessageEvent extends pl.MessageEvent {
	3: ScenarioMessageOption;
}
