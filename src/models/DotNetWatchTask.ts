import { ProcessExecution, Task, TaskExecution, WorkspaceFolder } from "vscode";

export default class DotNetWatchTask {
	public constructor(taskExec: TaskExecution) {
		this._id = DotNetWatchTask.GetIdFromTask(taskExec.task);
		this._workSpace = taskExec.task.scope as WorkspaceFolder;
		this._taskExec = taskExec;
		this._processId = undefined;

		this._projectPath = (this._taskExec.task.execution as ProcessExecution).args[2];

		const name_regex = /(^.+)(\\|\/)(.+.csproj)/;
		const matches = name_regex.exec(this._projectPath);
		if (matches && matches.length === 4) {
			this._project = matches[3];
			this._projectFolderPath = matches[1] + matches[2];
		}
	}
	private _id: string;
	private _workSpace: WorkspaceFolder;
	private _processId: number | undefined;
	private _projectPath = "";
	private _projectFolderPath = "";
	private _project = "";
	private _taskExec: TaskExecution;

	public get Id(): string {
		return this._id;
	}
	public get Workspace(): WorkspaceFolder {
		return this._workSpace;
	}
	public get ProjectPath(): string {
		return this._projectPath;
	}
	public get ProjectFolderPath(): string {
		return this._projectFolderPath;
	}
	public get Project(): string {
		return this._project;
	}
	public get ProcessId(): number | undefined {
		return this._processId;
	}
	public set ProcessId(num: number | undefined) {
		this._processId = num;
	}

	public static GetIdFromTask(task: Task): string {
		if (task.scope) {
			if ((task.scope as WorkspaceFolder).name) {
				return task.source + task.name + (task.scope as WorkspaceFolder).name;
			}
		}
		return "";
	}

	public Terminate(): void {
		this._taskExec.terminate();
	}
}
