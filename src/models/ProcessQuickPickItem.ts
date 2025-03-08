import { QuickPickItem } from "vscode";
import ProcessDetail from "./ProcessDetail";
import * as path from 'path';

export default class ProcessQuickPickItem implements QuickPickItem {
	public label: string;
	public description?: string;
	public detail?: string;
	public picked?: boolean;
	public readonly process?: ProcessDetail;

	constructor(label: string, description?: string, process?: ProcessDetail) {
		this.label = label;
		this.description = description;
		this.process = process;

		if (process) {
			// Extract project path from command line
			const projectPath = process.cml.split('watch')[1]?.trim() || '';
			const projectName = path.basename(projectPath);
			this.description = projectName;
			this.detail = process.cml;
		}
	}
}

