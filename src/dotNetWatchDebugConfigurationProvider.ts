import * as vscode from 'vscode';
import { WorkspaceFolder } from 'vscode';
import DotNetWatch from './dotNetWatch';
import IDotNetWatchDebugConfiguration from './interfaces/IDotNetWatchDebugConfiguration';
import ProcessQuickPickItem from './models/ProcessQuickPickItem';

export class DotNetWatchDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
	provideDebugConfigurations(
		folder: WorkspaceFolder | undefined
	): vscode.ProviderResult<Array<IDotNetWatchDebugConfiguration>> {
		if (folder) {
			return Promise.resolve(
				vscode.workspace.findFiles("**/*.csproj").then(async (k) => {
					const tmp = k.filter((m) => m.toString().startsWith(folder.uri.toString()));
					if (tmp.length > 1) {
						return await DotNetWatch.UiService.OpenMultiSelectProjectQuickPick(tmp).then((m) => {
							if (m && m.length !== 0) {
								return m.map((o) =>
									DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig(o.label)
								) as Array<IDotNetWatchDebugConfiguration>;
							} else {
								return new Array<IDotNetWatchDebugConfiguration>(
									DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig() as IDotNetWatchDebugConfiguration
								);
							}
						});
					} else {
						return new Array<IDotNetWatchDebugConfiguration>(
							DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig() as IDotNetWatchDebugConfiguration
						);
					}
				})
			);
		}
		return new Array<IDotNetWatchDebugConfiguration>(
			DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig() as IDotNetWatchDebugConfiguration
		);
	}

	private static GetDefaultDotNetWatchDebugConfig(project?: string): vscode.DebugConfiguration {
		const defaultConfig: vscode.DebugConfiguration = {
			type: "DotNetWatch",
			request: "launch",
			name: ".NET Core Watch",
			env: {
				ASPNETCORE_ENVIRONMENT: "Development",
				//wait for this pr: https://github.com/dotnet/sdk/pull/23280/files
				DOTNET_WATCH_RESTART_ON_RUDE_EDIT: "true",
			},
		};

		if (project && project.length !== 0) {
			defaultConfig.project = `${project}.csproj`;
			defaultConfig.name += `: ${project}`;
		}

		return defaultConfig;
	}

	public async resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: IDotNetWatchDebugConfiguration): Promise<IDotNetWatchDebugConfiguration | undefined> {
		debugConfiguration.env = {
			...(debugConfiguration.env || {}),
			DOTNET_WATCH_RESTART_ON_RUDE_EDIT: "true",
		};

		debugConfiguration.args = debugConfiguration.args || [];

		// if (!debugConfiguration.type)
		// 	return undefined;

		if (folder) {
			debugConfiguration.workspace = folder;
			const watchProcesses = DotNetWatch.ProcessService.GetDotNetWatchProcesses();

			if (watchProcesses.length > 0) {
				const quickPickItems: ProcessQuickPickItem[] = [
					{ label: "Debug current code base", description: "Start a new dotnet watch task" },
					...watchProcesses.map(process => ({
						label: `Process ID: ${process.pid}`,
						description: process.cml,
						process: process,
					}))
				];
				const selectedProcess = await DotNetWatch.UiService.OpenProcessQuickPick(quickPickItems);
				if (selectedProcess) {
					if (selectedProcess.label === "Debug current code base") {
						DotNetWatch.TaskService.StartDotNetWatchTask(debugConfiguration);
					} else if (selectedProcess.process) {
						DotNetWatch.Cache.ExternalDotnetWatchProcesses.setValue(selectedProcess.process.pid, selectedProcess.process);
						await DotNetWatch.AttachService.AttachToProcess(selectedProcess.process);
					}
				}
			} else {
				DotNetWatch.TaskService.StartDotNetWatchTask(debugConfiguration);
			}
		}
		return debugConfiguration;
	}

}
