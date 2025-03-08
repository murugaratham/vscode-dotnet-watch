import {
	Disposable,
	ProcessExecution,
	Task,
	TaskEndEvent,
	TaskExecution,
	TaskProcessStartEvent,
	TaskRevealKind,
	tasks,
	TextDocument,
	Uri,
	window,
	workspace
} from "vscode";
import DotNetWatch from "../dotNetWatch";

import DotNetWatchTask from "../models/DotNetWatchTask";
import { DotNetWatchDebugConfiguration } from "../dotNetWatchDebugConfigurationProvider";

export default class TaskService implements Disposable {
	private disposables: Set<Disposable>;

	public constructor() {
		this.disposables = new Set<Disposable>();
		this.disposables.add(tasks.onDidEndTask(TaskService.TryToRemoveEndedTask));
		this.disposables.add(tasks.onDidStartTaskProcess(TaskService.IsWatcherStartedSetProcessId));
	}

	private static TryToRemoveEndedTask(event: TaskEndEvent) {
		const taskId = DotNetWatchTask.GetIdFromTask(event.execution.task);
		if (taskId && taskId !== "") {
			DotNetWatch.Cache.RunningAutoAttachTasks.delete(taskId);
		}
	}

	private static IsWatcherStartedSetProcessId(event: TaskProcessStartEvent) {
		const taskId = DotNetWatchTask.GetIdFromTask(event.execution.task);
		if (DotNetWatch.Cache.RunningAutoAttachTasks.has(taskId)) {
			const task = DotNetWatch.Cache.RunningAutoAttachTasks.get(taskId) as DotNetWatchTask;
			task.WatchProcessId = event.processId;
			DotNetWatch.Cache.RunningAutoAttachTasks.set(taskId, task);
		}
	}

	private static StartTask(task: Task): void {
		const taskId = DotNetWatchTask.GetIdFromTask(task);
		if (!DotNetWatch.Cache.RunningAutoAttachTasks.has(taskId)) {
			const tmp = tasks.executeTask(task);
			// reserve task id first..
			DotNetWatch.Cache.RunningAutoAttachTasks.set(taskId, undefined);
			tmp.then((k: TaskExecution) => {
				const autoTask: DotNetWatchTask = new DotNetWatchTask(k);
				// now we populate the task.. else we might get a race
				DotNetWatch.Cache.RunningAutoAttachTasks.set(autoTask.Id, autoTask);
			});
		}
	}

	private static async GenerateTask(config: DotNetWatchDebugConfiguration, projectUri: Uri): Promise<Task> {
		const name_regex = /(^.+)(\/|\\)(.+).csproj/;
		const matches = name_regex.exec(projectUri.fsPath);
		let projectName = "",
			launchSettingsPath = "";
		if (matches && matches.length === 4) {
			projectName = matches[3];
			launchSettingsPath = `${matches[1]}/Properties/launchSettings.json`;
		}
		await TaskService.TryLoadLaunchProfile(launchSettingsPath, config);
		const taskDefinition = { type: 'DotNetWatch ' };
		const task: Task = new Task(
			taskDefinition,
			config.workspace,
			`Watch ${projectName}`,
			"DotNet Auto Attach",
			new ProcessExecution("dotnet", ["watch", "--project", projectUri.fsPath, "run", ...config.args], {
				cwd: config.workspace.uri.fsPath,
				env: config.env,
			}),
			"$msCompile"
		);
		//setting these gives a better experience when debugging
		task.presentationOptions.reveal = TaskRevealKind.Always;
		task.presentationOptions.showReuseMessage = false;
		return task;
	}

	//! is this really neccesary? we are not even using the return value?? need to create more example project and test it out
	private static async TryLoadLaunchProfile(launchSettingsPath: string, config: DotNetWatchDebugConfiguration) {
		try {
			const fulfilled = async (launchSettingsDocument: TextDocument) => {
				const launchSettings = JSON.parse(launchSettingsDocument.getText());
				//naively attempt to load first launch profile, until we know how to handle compound launch configurations
				return launchSettings.profiles && Object.keys(launchSettings.profiles)[0];
			};
			const selectedLaunchProfile = await workspace.openTextDocument(launchSettingsPath).then(fulfilled);
			if (selectedLaunchProfile) {
				config.args = config.args.concat(`--launch-profile ${selectedLaunchProfile}`);
			}
		} catch (error) {
			if (!(<Error>error).message.startsWith("cannot open file"))
				window.showErrorMessage(`Error loading launch profile [${launchSettingsPath}]: ${(error as Error).message}`);
		}
	}

	private CheckFilesFound(filesFound: Uri[]): Uri | undefined {
		filesFound.sort((a, b) => a.toString().length - b.toString().length);
		if (filesFound.length === 0 || filesFound.length > 1) {
			return undefined;
		} else {
			return filesFound[0];
		}
	}

	private CheckProjectConfig(project: string): Thenable<Uri | undefined> {
		const isCsproj = project.endsWith(".csproj");
		const workspaceFolderKeyword = '${workspaceFolder}';
		// if it is not a specific file, probably only a folder name.
		if (!isCsproj) {
			return workspace.findFiles(project + "/**/*.csproj").then(this.CheckFilesFound);
		}
		//this is definitely not the best way to search within workspace with user-specified ${workspaceFolder}
		if (project.startsWith(workspaceFolderKeyword)) {
			project = project.substring(workspaceFolderKeyword.length + 1);
		}
		const projectUri = Uri.file(project);

		if (workspace.workspaceFolders != null) {
			// probably full path, resolve like it is
			if (project.startsWith(workspace.workspaceFolders[0].uri.fsPath)) {
				return Promise.resolve(projectUri);
			} else {
				// if it is not a full path but only a name of a .csproj file
				return workspace.findFiles("**/" + project).then(this.CheckFilesFound);
			}
		}
		return Promise.resolve(undefined);
	}

	private StartDotNetWatchTaskNoProjectConfig(config: DotNetWatchDebugConfiguration): void {
		workspace.findFiles("**/*.csproj").then(async (k) => {
			const csProjFiles = k.filter((m) => m.toString().startsWith(config.workspace.uri.toString()));
			if (csProjFiles.length > 1) {
				DotNetWatch.UiService.OpenProjectQuickPick(csProjFiles).then(async (project) => {
					if (project) {
						const task = await TaskService.GenerateTask(config, project.uri);
						TaskService.StartTask(task);
					}
				});
			} else {
				const task = await TaskService.GenerateTask(config, csProjFiles[0]);
				TaskService.StartTask(task);
			}
		});
	}

	private StartDotNetWatchTaskWithProjectConfig(config: DotNetWatchDebugConfiguration): void {
		this.CheckProjectConfig(config.project).then(async (projectUri) => {
			if (projectUri) {
				const task = await TaskService.GenerateTask(config, projectUri);
				TaskService.StartTask(task);
			}
			// if no project not found or it isn't unique show error message.
			else {
				DotNetWatch.UiService.ProjectDoesNotExistErrorMessage(config).then((open) => {
					if (open) {
						workspace.findFiles("**/launch.json").then((files) => {
							if (files && files.length > 0) {
								workspace.openTextDocument(files[0]).then((doc) => window.showTextDocument(doc));
							}
						});
					}
				});
			}
		});
	}

	public StartDotNetWatchTask(config: DotNetWatchDebugConfiguration) {
		DotNetWatch.AttachService.StartAutoAttachScanner();
		// Check if there is a no project configured
		if (!config.project || 0 === config.project.length) {
			this.StartDotNetWatchTaskNoProjectConfig(config);
		} else {
			this.StartDotNetWatchTaskWithProjectConfig(config);
		}
	}

	public dispose() {
		this.disposables.forEach((k) => {
			k.dispose();
		});
		this.disposables.clear();
	}
}
