// TODO: filiNameはScreenshotが持つのではなく、ファイル書き出し時に初めて決まるべき
export interface Screenshot {
	fileName: string;
	base64: string;
}
