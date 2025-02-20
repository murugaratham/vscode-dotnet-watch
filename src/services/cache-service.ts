import { Dictionary } from "typescript-collections";
import { DebugSession, Disposable } from "vscode";
import DotNetWatchTask from "../models/DotNetWatchTask";
import ProcessDetail from "../models/ProcessDetail";

export default class CacheService implements Disposable {
  public constructor() {
    this.RunningAutoAttachTasks = new Dictionary<string, DotNetWatchTask>();
    this.RunningDebugs = new Dictionary<number, DebugSession>();
    this.DisconnectedDebugs = new Set<number>();
    this.ExternalDotnetWatchProcesses = new Dictionary<number, ProcessDetail>();
  }

  public RunningAutoAttachTasks: Dictionary<string, DotNetWatchTask>;
  public RunningDebugs: Dictionary<number, DebugSession>;
  public DisconnectedDebugs: Set<number>;
	public ExternalDotnetWatchProcesses: Dictionary<number, ProcessDetail>;

  public dispose() {
    this.RunningAutoAttachTasks.forEach((k, v) => {
      v.Terminate();
    });
    this.RunningAutoAttachTasks.clear();
    this.RunningDebugs.clear();
    this.DisconnectedDebugs.clear();
    this.ExternalDotnetWatchProcesses.clear();
  }
}
