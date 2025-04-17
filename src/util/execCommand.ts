import { execSync } from "child_process";

export function execCommand(command: string): string {
	try {
		return execSync(command).toString();
	} catch (error: any) {
		const errorMessage = error.stdout ? error.stdout.toString() : error.message;
		console.error(errorMessage, error.stderr?.toString()); // 実行環境によってはコンソール上に表示しないとエラー内容が読めない場合もあるため
		throw new Error(errorMessage);
	}
}
