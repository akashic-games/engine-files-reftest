const TIMEOUT = Symbol("timeout");

export function timeout(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms, TIMEOUT));
}

export function untilResolve<T>(f: () => Promise<T>, ms: number): Promise<T> {
	return f().catch(() => timeout(ms).then(() => untilResolve(f, ms)));
}

export function withTimeLimit<T>(ms: number, message: string, fun: () => Promise<T>, _timeoutFun?: () => Promise<void>): Promise<T | void> {
	return Promise.race([fun(), timeout(ms)])
		.then((v) => {
			if (v === TIMEOUT) {
				throw new TimeoutError(message);
			}
		});
}

export class TimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TimeoutError";
	}
}
