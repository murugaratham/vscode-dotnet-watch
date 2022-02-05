/*
 * @file Contains the DotNetWatchTask class.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-15 14:34:31
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2019-01-26 12:18:51
 */

import { ProcessExecution, Task, TaskExecution, WorkspaceFolder } from "vscode";

/**
 * The DotNetWatchTask, represents a running AutoAttachTask
 *
 * @export
 * @class DotNetWatchTask
 */
export default class DotNetWatchTask {
  /**
   * Creates an instance of DotNetWatchTask.
   * @param {TaskExecution} taskExec
   * @memberof DotNetWatchTask
   */
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
  /**
   * The Id
   *
   * @private
   * @type {string}
   * @memberof DotNetWatchTask
   */
  private _id: string;

  /**
   * The WorkspaceFolder
   *
   * @private
   * @type {WorkspaceFolder}
   * @memberof DotNetWatchTask
   */
  private _workSpace: WorkspaceFolder;

  /**
   * The ProcessId
   *
   * @private
   * @type {(number | undefined)}
   * @memberof DotNetWatchTask
   */
  private _processId: number | undefined;

  /**
   * The ProjectPath
   *
   * @private
   * @type {string}
   * @memberof DotNetWatchTask
   */
  private _projectPath = "";

  /**
   * The ProjectFolderPath
   *
   * @private
   * @type {string}
   * @memberof DotNetWatchTask
   */
  private _projectFolderPath = "";

  /**
   * The Project
   *
   * @private
   * @type {string}
   * @memberof DotNetWatchTask
   */
  private _project = "";

  /**
   * The TaskExecution
   *
   * @private
   * @type {TaskExecution}
   * @memberof DotNetWatchTask
   */
  private _taskExec: TaskExecution;

  /**
   * Get the Task ID.
   *
   * @readonly
   * @type {string}
   * @memberof DotNetWatchTask
   */
  public get Id(): string {
    return this._id;
  }
  /**
   * Get the Workspace.
   *
   * @readonly
   * @type {WorkspaceFolder}
   * @memberof DotNetWatchTask
   */
  public get Workspace(): WorkspaceFolder {
    return this._workSpace;
  }

  /**
   * Gets the ProjectPath.
   *
   * @readonly
   * @type {string}
   * @memberof DotNetWatchTask
   */
  public get ProjectPath(): string {
    return this._projectPath;
  }

  /**
   * Gets the ProjectFolderPath.
   *
   * @readonly
   * @type {string}
   * @memberof DotNetWatchTask
   */
  public get ProjectFolderPath(): string {
    return this._projectFolderPath;
  }

  /**
   * Gets the Project
   *
   * @readonly
   * @type {string}
   * @memberof DotNetWatchTask
   */
  public get Project(): string {
    return this._project;
  }

  /**
   * Gets the ProcessId.
   *
   * @type {(number | undefined)}
   * @memberof DotNetWatchTask
   */
  public get ProcessId(): number | undefined {
    return this._processId;
  }
  /**
   * Sets the ProcessId.
   *
   * @memberof DotNetWatchTask
   */
  public set ProcessId(num: number | undefined) {
    this._processId = num;
  }
  /**
   * Generates the TaskID from a task.
   *
   * @static
   * @param {Task} task
   * @returns {string}
   * @memberof DotNetWatchTask
   */
  public static GetIdFromTask(task: Task): string {
    if (task.scope) {
      if ((task.scope as WorkspaceFolder).name) {
        return task.source + task.name + (task.scope as WorkspaceFolder).name;
      }
    }
    return "";
  }

  /**
   * Terminates the execution.
   *
   * @memberof DotNetWatchTask
   */
  public Terminate(): void {
    this._taskExec.terminate();
  }
}
