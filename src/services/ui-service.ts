import { Disposable, QuickPickOptions, Uri, window } from "vscode";
import DotNetWatchDebugConfiguration from "../interfaces/IDotNetWatchDebugConfiguration";
import ProjectQuickPickItem from "../models/ProjectQuickPickItem";
import ProcessQuickPickItem from '../models/ProcessQuickPickItem';
import ProcessDetail from "../models/ProcessDetail";

export default class UiService implements Disposable {
	public OpenProjectQuickPick(uris: Array<Uri>): Thenable<ProjectQuickPickItem | undefined> {
		const quickPickOptions: QuickPickOptions = {
			canPickMany: false,
			placeHolder: "Select the project to launch the DotNet Watch task for.",
			matchOnDescription: true,
			matchOnDetail: true,
		};
		return window.showQuickPick(
			uris.map((k) => new ProjectQuickPickItem(k)),
			quickPickOptions
		);
	}

	public OpenMultiSelectProjectQuickPick(uris: Array<Uri>): Thenable<Array<ProjectQuickPickItem> | undefined> {
		return window.showQuickPick(
			uris.map((k) => new ProjectQuickPickItem(k)),
			{
				canPickMany: true,
				placeHolder: "Select the projects you want to add to launch.json.",
				matchOnDescription: true,
				matchOnDetail: true,
			}
		);
	}

	public ProjectDoesNotExistErrorMessage(debugConfig: DotNetWatchDebugConfiguration): Thenable<boolean> {
		return window
			.showErrorMessage(
				`The debug configuration '${debugConfig.name}' within the launch.json references a project that cannot be found or is not unique (${debugConfig.project}).`,
				"Open launch.json"
			)
			.then((value) => {
				if (value && value === "Open launch.json") {
					return true;
				} else {
					return false;
				}
			});
	}

	public GenericErrorMessage(err: string) {
		return window.showErrorMessage(err);
	}

	public OpenProcessQuickPick(processes: Array<ProcessQuickPickItem>): Thenable<ProcessQuickPickItem | undefined> {
		const quickPickOptions: QuickPickOptions = {
			canPickMany: false,
			placeHolder: "Select the .NET process to attach debugger",
			matchOnDescription: true,
			matchOnDetail: true
		};

		return window.showQuickPick(
			processes.map((p) => new ProcessQuickPickItem(p.label, p.description, p.process)),
			quickPickOptions
		);
	}

	public static async ShowReattachPrompt(process: ProcessDetail): Promise<string | undefined> {
		return window.showInformationMessage(
			`Auto reattach to process? ${process.pid}: ${process.cml}`,
			"Always", "Yes, once", "No"
		);
	}

	public dispose() { }
}
