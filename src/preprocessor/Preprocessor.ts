export interface Preprocessor {
	/**
	 * 与えられたコンテンツを変形し、一時フォルダに出力する。そのパスを返す。
	 */
	run(contentDirPath: string): Promise<string>;
	/**
	 * プリプロセサを破棄する。
	 * install したものがあれば uninstall する。
	 */
	dispose(): Promise<void>;
	/**
	 * 利用しているツールのバージョン情報を取得する。
	*/
	getVersionInfo(): string;

	/**
	 * 終了通知
	 */
	finish(): Promise<void>;
}
