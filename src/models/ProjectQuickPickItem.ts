import { QuickPickItem, Uri } from "vscode";

export default class ProjectQuickPickItem implements QuickPickItem {
	public constructor(uri: Uri) {
		const name_regex = /^.+(\/|\\)(.+).csproj/;
		const matches = name_regex.exec(uri.fsPath);
		if (matches && matches.length === 3) {
			this.label = matches[2];
		}
		this.detail = uri.fsPath;
		this.uri = uri;
	}
	public label = "";
	public description?: string;
	public detail?: string;
	public picked?: boolean;
	public readonly uri: Uri;
}
