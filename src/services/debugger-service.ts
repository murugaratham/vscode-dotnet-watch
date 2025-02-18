import * as vscode from "vscode";
import { debug, DebugSession, Disposable } from "vscode";
import DotNetWatch from "../dotNetWatch";

export default class DebuggerService implements Disposable {

  public constructor() {
    this.disposables = new Set<Disposable>();
    this.disposables.add(debug.onDidStartDebugSession(DebuggerService.AddDebugSession));
    vscode.debug.registerDebugAdapterTrackerFactory("*", {
      createDebugAdapterTracker(session: DebugSession) {
        return {
          onWillReceiveMessage: (m) => {
            if (m.command && m.command == "disconnect" && m.arguments) {
              if (m.arguments.restart && m.arguments.restart === true) {
                DebuggerService.TryToRemoveDisconnectedDebugSession(session);
              }
            }
          },
        };
      },
    });
  }

  private disposables: Set<Disposable>;

  private static AddDebugSession(session: vscode.DebugSession): void {
    DotNetWatch.Cache.RunningDebugs.forEach((k, v) => {
      if (v.name === session.name) {
        DotNetWatch.Cache.RunningDebugs.setValue(k, session);
      }
    });
  }

  private static TryToRemoveDisconnectedDebugSession(session: vscode.DebugSession): void {
    DotNetWatch.Cache.RunningDebugs.forEach((k, v) => {
      if (v.name === session.name) {
        DotNetWatch.Cache.RunningDebugs.remove(k);
        DotNetWatch.Cache.DisconnectedDebugs.add(k);
        const task = DotNetWatch.Cache.RunningAutoAttachTasks.values().find((t) =>
          session.name.toLocaleLowerCase().startsWith(t.Project.toLocaleLowerCase())
        );
        DotNetWatch.Cache.RunningAutoAttachTasks.remove(v.id);
        task?.Terminate();
        // Remove from ExternalDotnetWatchProcesses if exists
        if (DotNetWatch.Cache.ExternalDotnetWatchProcesses.containsKey(k)) {
          DotNetWatch.Cache.ExternalDotnetWatchProcesses.remove(k);
        }
      }
    });
  }

  private DisconnectDebugger(debugSessionId: number): void {
    // Disconnect old debug
    const debugSession = DotNetWatch.Cache.RunningDebugs.getValue(debugSessionId);
    if (debugSession) {
      DotNetWatch.Cache.RunningDebugs.remove(debugSessionId);
      debugSession.customRequest("disconnect");
    }
  }

  public DisconnectOldDotNetDebugger(matchedPids: Array<number>) {
    // If matched processes does not have running debugs then we need to kill this debug
    DotNetWatch.Cache.RunningDebugs.keys().forEach((runningDebug) => {
      if (matchedPids.indexOf(runningDebug) < 0) {
        this.DisconnectDebugger(runningDebug);
      }
    });
  }

  public AttachDotNetDebugger(pid: number, baseConfig: vscode.DebugConfiguration, path: string): void {
    const unquotedPath = path.replace(/^"/, "");
    const task = DotNetWatch.Cache.RunningAutoAttachTasks.values().find((t) =>
      unquotedPath.startsWith(t.ProjectFolderPath)
    );
    if (!DotNetWatch.Cache.RunningDebugs.containsKey(pid) && !DotNetWatch.Cache.DisconnectedDebugs.has(pid) && task) {
      baseConfig.processId = pid.toString(10);
      baseConfig.name = `${task.Project} - ${baseConfig.name}`;
      DotNetWatch.Cache.RunningDebugs.setValue(pid, { name: baseConfig.name } as vscode.DebugSession);
      vscode.debug.startDebugging(undefined, baseConfig);
    } else if (DotNetWatch.Cache.DisconnectedDebugs.has(pid) && task) {
      DotNetWatch.Cache.RunningDebugs.remove(pid);
      DotNetWatch.Cache.DisconnectedDebugs.delete(pid);
      task.Terminate();
    } else if (DotNetWatch.Cache.ExternalDotnetWatchProcesses.containsKey(pid) && !DotNetWatch.Cache.RunningDebugs.containsKey(pid)) {
      const process = DotNetWatch.Cache.ExternalDotnetWatchProcesses.getValue(pid);
      if (process) {
        baseConfig.processId = pid.toString(10);
        baseConfig.name = `${process.cml} - ${baseConfig.name}`;
        DotNetWatch.Cache.RunningDebugs.setValue(pid, { name: baseConfig.name } as vscode.DebugSession);
        vscode.debug.startDebugging(undefined, baseConfig);
        // Remove from ExternalDotnetWatchProcesses after attaching
        DotNetWatch.Cache.ExternalDotnetWatchProcesses.remove(pid);
      }
    }
  }

  public dispose(): void {
    this.disposables.forEach((k) => k.dispose());
    this.disposables.clear();
  }
}
