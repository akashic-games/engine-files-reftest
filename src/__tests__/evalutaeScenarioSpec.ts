import * as path from "path";
import { evaluateScenario } from "../scenarioRunner/evaluateScenario";

describe("evaluateScenario", () => {
	it("evaluateScenario で playlog の全てのスクリーンショットがとれるまで待つ", async () => {
		const playlogJsonPath = path.resolve("./src/__tests__/fixture/evaluate-playlog.json");
		const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

		const fileNames: string[] = [];
		const ret = evaluateScenario(playlogJsonPath,
			{
				pointDown: async (_x: number, _y: number) => {
					return;
				},
				pointMove: async (_x: number, _y: number) => {
					return;
				},
				pointUp: async (_x: number, _y: number) => {
					return;
				},
				takeScreenshot: async (fileName: string) => {
					await wait(100);
					fileNames.push(fileName);
				}
			}
		);

		expect(fileNames).toEqual([]);
		await ret;
		expect(fileNames.length).toBe(4); // 全ての promise が終わりスクショ対象のファイル名が取れている
	});
});
