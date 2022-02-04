/*
 * @file Contains the TaskService.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-15 14:31:53
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2019-02-23 15:41:13
 */

import {
  Disposable,
  ProcessExecution,
  Task,
  TaskDefinition,
  TaskEndEvent,
  TaskExecution,
  TaskProcessStartEvent,
  tasks,
  Uri,
  window,
  workspace,
} from "vscode";
import * as vscodeVariables from "vscode-variables";
import DotNetAutoAttach from "../dotNetAutoAttach";
import DotNetAutoAttachDebugConfiguration from "../interfaces/IDotNetAutoAttachDebugConfiguration";
import DotNetAutoAttachTask from "../models/DotNetAutoAttachTask";
import LaunchProfileQuickPickItem from "../models/LaunchProfileQuickPickItem";
import { ILaunchSettings } from "../models/LaunchSettings";

/**
 * The TaskService, provides functions to manage tasks.
 *
 * @export
 * @class TaskService
 */
export default class TaskService implements Disposable {
  /**
   * Creates an instance of TaskService.
   * @memberof TaskService
   */
  public constructor() {
    this.disposables = new Set<Disposable>();
    this.disposables.add(tasks.onDidEndTask(TaskService.TryToRemoveEndedTask));
    this.disposables.add(tasks.onDidStartTaskProcess(TaskService.IsWatcherStartedSetProcessId));
  }

  /**
   * A list of all disposables.
   *
   * @private
   * @type {Set<Disposable>}
   * @memberof TaskService
   */
  private disposables: Set<Disposable>;

  /**
   * Try's to remove the Task of the TaskEndEvent from cache.
   *
   * @private
   * @static
   * @param {TaskEndEvent} event
   * @memberof TaskService
   */
  private static TryToRemoveEndedTask(event: TaskEndEvent) {
    const taskId = DotNetAutoAttachTask.GetIdFromTask(event.execution.task);
    if (taskId && taskId !== "") {
      DotNetAutoAttach.Cache.RunningAutoAttachTasks.remove(taskId);
    }
  }

  /**
   * Check if the started process task is a watcher task, Sets it process id.
   *
   * @private
   * @static
   * @param {TaskProcessStartEvent} event
   * @memberof TaskService
   */
  private static IsWatcherStartedSetProcessId(event: TaskProcessStartEvent) {
    const taskId = DotNetAutoAttachTask.GetIdFromTask(event.execution.task);
    if (DotNetAutoAttach.Cache.RunningAutoAttachTasks.containsKey(taskId)) {
      const task = DotNetAutoAttach.Cache.RunningAutoAttachTasks.getValue(taskId) as DotNetAutoAttachTask;
      task.ProcessId = event.processId;
      DotNetAutoAttach.Cache.RunningAutoAttachTasks.setValue(taskId, task);
    }
  }

  /**
   * Start a task.
   *
   * @private
   * @static
   * @param {Task} task
   * @memberof TaskService
   */
  private static StartTask(task: Task): void {
    if (!DotNetAutoAttach.Cache.RunningAutoAttachTasks.containsKey(DotNetAutoAttachTask.GetIdFromTask(task))) {
      const tmp = tasks.executeTask(task);
      tmp.then((k: TaskExecution) => {
        const autoTask: DotNetAutoAttachTask = new DotNetAutoAttachTask(k);
        DotNetAutoAttach.Cache.RunningAutoAttachTasks.setValue(autoTask.Id, autoTask);
      });
    } else {
      DotNetAutoAttach.UiService.TaskAlreadyStartedInformationMessage(task.definition.type.replace("Watch ", ""));
    }
  }

  /**
   * Generates a Task out of a AutoAttachDebugConfiguration and a project uri path.
   *
   * @private
   * @static
   * @param {DotNetAutoAttachDebugConfiguration} config
   * @param {string} [project=""]
   * @returns {Task}
   * @memberof TaskService
   */
  private static async GenerateTask(config: DotNetAutoAttachDebugConfiguration, projectUri: Uri): Promise<Task> {
    let projectName = "";
    let launchSettingsPath = "";
    let launchProfiles = [];
    let selectedLaunchProfile: LaunchProfileQuickPickItem | undefined;
    const name_regex = /(^.+)(\/|\\)(.+).csproj/;
    const matches = name_regex.exec(projectUri.fsPath);
    if (matches && matches.length === 4) {
      projectName = matches[3];
      //default launch settings path
      //todo: handle missing launch profile
      launchSettingsPath = `${matches[1]}/Properties/launchSettings.json`;
    }

    try {
      //todo: must we do this? need to find a better way
      //while (selectedLaunchProfile === undefined) {
      await workspace.openTextDocument(launchSettingsPath).then(async (launchSettingsDocument) => {
        const launchSettings: ILaunchSettings = JSON.parse(launchSettingsDocument.getText());
        launchProfiles = launchSettings.profiles ? Object.keys(launchSettings.profiles) : [];
        if (launchProfiles.length > 1) {
          await DotNetAutoAttach.UiService.OpenLaunchProfileQuickPick(projectName, launchProfiles.concat()).then(
            (selectedProfile) => {
              if (selectedProfile) selectedLaunchProfile = selectedProfile;
            }
          );
        } else if (launchProfiles.length === 1) {
          //todo: figure out what's wrong here
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          selectedLaunchProfile = launchProfiles[0];
        }
      });
      //}
      if (selectedLaunchProfile) {
        config.args = config.args.concat(`--launch-profile ${selectedLaunchProfile?.label}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      DotNetAutoAttach.UiService.GenericErrorMessage(`Error opening launch profile: ${error.message}`);
    }

    const task: Task = new Task(
      { type: "Watch " + projectName } as TaskDefinition,
      config.workspace,
      "Watch" + " " + projectName,
      "DotNet Auto Attach",
      new ProcessExecution("dotnet", ["watch", "--project", projectUri.fsPath, "run", ...config.args], {
        cwd: config.workspace.uri.fsPath,
        env: config.env,
      }),
      "$mscompile"
    );

    return task;
  }

  /**
   * Checks the files which where found.
   *
   * @private
   * @param {Array<Uri>} filesFound
   * @returns {(Uri | undefined)}
   * @memberof TaskService
   */
  private CheckFilesFound(filesFound: Array<Uri>): Uri | undefined {
    filesFound.sort((a, b) => a.toString().length - b.toString().length);
    if (filesFound.length === 0 || filesFound.length > 1) {
      return undefined;
    } else {
      return filesFound[0];
    }
  }

  /**
   * Checks the Project config.
   *
   * @private
   * @param {string} project
   * @returns {(Thenable<Uri | undefined>)}
   * @memberof TaskService
   */
  private CheckProjectConfig(project: string): Thenable<Uri | undefined> {
    const decodedProject = vscodeVariables(project);
    const isCsproj = project.endsWith(".csproj");

    // if it is not a specific file, probably only a folder name.
    if (!isCsproj) {
      return workspace.findFiles(decodedProject + "/**/*.csproj").then(this.CheckFilesFound);
    }

    const projectUri = Uri.file(decodedProject);

    if (workspace.workspaceFolders != null) {
      // probably full path, resolve like it is
      if (decodedProject.startsWith(workspace.workspaceFolders[0].uri.fsPath)) {
        return Promise.resolve(projectUri);
      } else {
        // if it is not a full path but only a name of a .csproj file
        return workspace.findFiles("**/" + decodedProject).then(this.CheckFilesFound);
      }
    }

    return Promise.resolve(undefined);
  }

  /**
   * Start DotNetWatchTask when no project is configured.
   *
   * @private
   * @param {DotNetAutoAttachDebugConfiguration} config
   * @memberof TaskService
   */
  private StartDotNetWatchTaskNoProjectConfig(config: DotNetAutoAttachDebugConfiguration): void {
    workspace.findFiles("**/*.csproj").then(async (k) => {
      const tmp = k.filter((m) => m.toString().startsWith(config.workspace.uri.toString()));
      if (tmp.length > 1) {
        DotNetAutoAttach.UiService.OpenProjectQuickPick(tmp).then(async (s) => {
          if (s) {
            const task = await TaskService.GenerateTask(config, s.uri);
            TaskService.StartTask(task);
          }
        });
      } else {
        const task = await TaskService.GenerateTask(config, tmp[0]);
        TaskService.StartTask(task);
      }
    });
  }

  /**
   * Start DotNetWatchTask when projcet is configured.
   *
   * @private
   * @param {DotNetAutoAttachDebugConfiguration} config
   * @memberof TaskService
   */
  private StartDotNetWatchTaskWithProjectConfig(config: DotNetAutoAttachDebugConfiguration): void {
    this.CheckProjectConfig(config.project).then(async (projectUri) => {
      if (projectUri) {
        const task = await TaskService.GenerateTask(config, projectUri);
        TaskService.StartTask(task);
      }
      // if no project not found or it isn't unique show error message.
      else {
        DotNetAutoAttach.UiService.ProjectDoesNotExistErrorMessage(config).then((open) => {
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

  /**
   * Start a new DotNet Watch Task
   *
   * @param {DotNetAutoAttachDebugConfiguration} config
   * @memberof TaskService
   */
  public StartDotNetWatchTask(config: DotNetAutoAttachDebugConfiguration) {
    // Check if there is a no project configured
    if (!config.project || 0 === config.project.length) {
      this.StartDotNetWatchTaskNoProjectConfig(config);
    } else {
      this.StartDotNetWatchTaskWithProjectConfig(config);
    }
  }

  /**
   * Dispose.
   *
   * @memberof TaskService
   */
  public dispose() {
    this.disposables.forEach((k) => {
      k.dispose();
    });
    this.disposables.clear();
  }
}
