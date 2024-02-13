import * as browserify from "browserify";

/**
 * 指定されたエントリポイントのbundle済みソースコードを返す
 */
export function bundle(entryPoint: string, externals: string[] = []): Promise<string> {
	const b = browserify({ entries: entryPoint });
	externals.forEach(e => b.external(e));
	return new Promise<string>((resolve, reject) => {
		b.bundle((err: Error, buf: Buffer) => {
			if (err) {
				return reject(err);
			}
			resolve(buf.toString());
		});
	});
}
