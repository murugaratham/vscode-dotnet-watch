import { clearInterval, setInterval } from "timers";
import { DebugConfiguration, Disposable } from "vscode";
import * as vscode from "vscode";
import DotNetWatch from "../dotNetWatch";
import ProcessDetail from "../models/ProcessDetail";
import * as fsPath from "path";

export default class AttachService implements Disposable {
  public constructor() {
    this.disposables = new Set<Disposable>();
    this.timer = undefined;
  }

  private static interval = 1000;
  private static readonly processPathDiscriminator = ["", "bin", "Debug"].join(fsPath.sep);
  private disposables: Set<Disposable>;
  private timer: NodeJS.Timer | undefined;
  private static GetDefaultConfig(): DebugConfiguration {
    return {
      type: "coreclr",
      request: "attach",
      name: ".NET Watch",
    };
  }

  public StartTimer(): void {
    this.timer = setInterval(async () => {
      await this.ScanToAttachAutoTask();
    }, AttachService.interval);
  }

  public StopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async ScanToAttachAutoTask(): Promise<void> {
    // Get processes from running tasks
    let processesToScan = new Array<ProcessDetail>();
    const runningTasks = DotNetWatch.Cache.RunningAutoAttachTasks;

    runningTasks.forEach((k, v) => {
        if (v && v.ProcessId) {
            processesToScan = processesToScan.concat(
                DotNetWatch.ProcessService.GetProcesses(v.ProcessId.toString())
            );
        }
    });

		// started by us
    let matchedProcesses = processesToScan.filter(p =>
        p.cml.includes(AttachService.processPathDiscriminator) &&
        DotNetWatch.AttachService.CheckForWorkspace(p)
    );

 		// Remove duplicates by process ID
    matchedProcesses = Array.from(
        new Map(matchedProcesses.map(p => [p.pid, p])).values(),
    );

		// exclude processes that are already being debugged
		matchedProcesses = matchedProcesses.filter(
			p => !DotNetWatch.Cache.RunningDebugs.keys().includes(p.pid)
		);

		if (matchedProcesses.length === 1) {
        await this.AttachToProcess(matchedProcesses[0]);
    }

    if (matchedProcesses.length > 0) {
        DotNetWatch.DebugService.DisconnectOldDotNetDebugger(
            matchedProcesses.map(p => p.pid)
        );
    }
  }

  public async AttachToProcess(process: ProcessDetail): Promise<void> {
    const pathRgx = /(.*)(run|--launch-profile.+|)/g;
    const matches = pathRgx.exec(process.cml);
    let path = "";
    if (matches && matches.length === 3) {
      path = matches[1];
    }

    await DotNetWatch.DebugService.AttachDotNetDebugger(
      process.pid,
      AttachService.GetDefaultConfig(),
      path
    );
  }

  private CheckForWorkspace(process: ProcessDetail): boolean {
    if (vscode.workspace.workspaceFolders) {
      for (const element of vscode.workspace.workspaceFolders) {
        const path = vscode.Uri.file(
          process.cml.replace("dotnet exec ", "").replace('"dotnet" exec ', "").replace('"', "")
        );
        if (path.fsPath.includes(element.uri.fsPath)) {
          return true;
        }
      }
    }
    return false;
  }

  public dispose(): void {
    this.disposables.forEach((k) => {
      k.dispose();
    });
    this.StopTimer();
  }
}
