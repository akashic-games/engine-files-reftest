import { execSync } from "child_process";

export function execCommand(command: string): string {
	try {
		return execSync(command).toString();
	} catch (error: any) {
		if (error.stdout) {
			console.log(error.stdout.toString());
		}
		if (error.stderr) {
			console.error(error.stderr.toString());
		}
		throw error;
	}
}
