import { Disposable, QuickPickOptions, Uri, window } from "vscode";
import ProjectQuickPickItem from "../models/ProjectQuickPickItem";
import ProcessDetail from "../models/ProcessDetail";
import ProcessQuickPickItem from "../models/ProcessQuickPickItem";
import { DotNetWatchDebugConfiguration } from "../dotNetWatchDebugConfigurationProvider";

export default class UiService implements Disposable {
	public OpenProjectQuickPick(uris: Uri[]) {
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

	public OpenMultiSelectProjectQuickPick(uris: Uri[]) {
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

	public ProjectDoesNotExistErrorMessage(debugConfig: DotNetWatchDebugConfiguration) {
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

	public OpenProcessQuickPick(processes: ProcessQuickPickItem[]) {
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
