import { QuickPickItem } from "vscode";

export default class LaunchProfileQuickPickItem implements QuickPickItem {
	public constructor(profileName: string) {
		this.label = profileName;
	}

	public label = "";
	public picked?: boolean;
}
