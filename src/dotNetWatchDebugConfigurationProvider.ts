import * as vscode from 'vscode';
import { WorkspaceFolder } from 'vscode';
import DotNetWatch from './dotNetWatch';
import IDotNetWatchDebugConfiguration from './interfaces/IDotNetWatchDebugConfiguration';
import ProcessQuickPickItem from './models/ProcessQuickPickItem';

export class DotNetWatchDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
	public async provideDebugConfigurations(
		folder: WorkspaceFolder | undefined
	): Promise<IDotNetWatchDebugConfiguration[]> {
		if (!folder) {
			return [DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig() as IDotNetWatchDebugConfiguration];
		}

		const csprojFiles = await vscode.workspace.findFiles("**/*.csproj");
		const folderFiles = csprojFiles.filter(file =>
			file.toString().startsWith(folder.uri.toString())
		);

		if (folderFiles.length > 1) {
			const selectedProjects = await DotNetWatch.UiService.OpenMultiSelectProjectQuickPick(folderFiles);
			if (selectedProjects && selectedProjects.length > 0) {
				return selectedProjects.map(item =>
					DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig(item.label)
				) as IDotNetWatchDebugConfiguration[];
			}
		}
		return [DotNetWatchDebugConfigurationProvider.GetDefaultDotNetWatchDebugConfig() as IDotNetWatchDebugConfiguration];
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

	public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: IDotNetWatchDebugConfiguration) {
		debugConfiguration.env = {
			...(debugConfiguration.env || {}),
			DOTNET_WATCH_RESTART_ON_RUDE_EDIT: "true",
		};

		debugConfiguration.args = debugConfiguration.args || [];

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
				DotNetWatch.UiService.OpenProcessQuickPick(quickPickItems).then((value) => {
					if (value) {
						if (value.label === "Debug current code base") {
							DotNetWatch.TaskService.StartDotNetWatchTask(debugConfiguration);
						} else if (value.process) {
							DotNetWatch.Cache.ExternalDotnetWatchProcesses.set(value.process.pid, value.process);
							DotNetWatch.AttachService.AttachToProcess(value.process);
						}
					}
				});
			} else {
				DotNetWatch.TaskService.StartDotNetWatchTask(debugConfiguration);
			}
		}
		return debugConfiguration;
	}
}
