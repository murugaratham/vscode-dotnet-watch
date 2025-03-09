import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration } from 'vscode';
import DotNetWatch from './dotNetWatch';

export interface DotNetWatchDebugConfiguration extends DebugConfiguration {
	workspace: WorkspaceFolder;
	args: string[];
	env?: Record<string, string>;
	project: string;
}


export class DebugConfigProvider implements vscode.DebugConfigurationProvider {
	public async provideDebugConfigurations(folder: WorkspaceFolder | undefined) {
		if (!folder) {
			return [DebugConfigProvider.GetDefaultDotNetWatchDebugConfig()];
		}
		const csprojFiles = await vscode.workspace.findFiles("**/*.csproj");
		const folderFiles = csprojFiles.filter(file =>
			file.toString().startsWith(folder.uri.toString())
		);

		if (folderFiles.length > 1) {
			const selectedProjects = await DotNetWatch.UiService.OpenMultiSelectProjectQuickPick(folderFiles);
			if (selectedProjects && selectedProjects.length > 0) {
				return selectedProjects.map(item =>
					DebugConfigProvider.GetDefaultDotNetWatchDebugConfig(item.label)
				);
			}
		}
		return [DebugConfigProvider.GetDefaultDotNetWatchDebugConfig()];
	}

	private static GetDefaultDotNetWatchDebugConfig(project?: string): vscode.DebugConfiguration {
		const defaultConfig: vscode.DebugConfiguration = {
			type: "DotNetWatch",
			request: "launch",
			name: ".NET Core Watch",
			env: {
				ASPNETCORE_ENVIRONMENT: "Development",
				DOTNET_WATCH_RESTART_ON_RUDE_EDIT: "true",
			},
		};
		if (project && project.length !== 0) {
			defaultConfig.project = `${project}.csproj`;
			defaultConfig.name += `: ${project}`;
		}

		return defaultConfig;
	}

	public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DotNetWatchDebugConfiguration) {
		debugConfiguration.env = {
			...(debugConfiguration.env ?? {})
		};

		debugConfiguration.args = debugConfiguration.args || [];

		if (folder) {
			debugConfiguration.workspace = folder;
			const watchProcesses = DotNetWatch.ProcessService.GetDotNetWatchProcesses();

			if (watchProcesses.length > 0) {
				const quickPickItems = [
					{ label: "Debug current code base", description: "Start a new dotnet watch task" },
					...watchProcesses.map(process => ({
						label: `Process ID: ${process.pid as unknown as string}`,
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
