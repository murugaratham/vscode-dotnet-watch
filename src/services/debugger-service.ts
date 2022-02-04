/*
 * @file Contains the DebuggerService.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-13 20:33:10
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2019-02-23 16:09:44
 */

"use strict";
import * as vscode from "vscode";
import { debug, Disposable } from "vscode";
import DotNetAutoAttach from "../dotNetAutoAttach";

/**
 * The DebuggerService. Provide functionality for starting, and manageing debug sessions.
 *
 * @export
 * @class DebuggerService
 */
export default class DebuggerService implements Disposable {
  /**
   * Creates an instance of DebuggerService.
   * @memberof DebuggerService
   */
  public constructor() {
    this.disposables = new Set<Disposable>();
    this.disposables.add(debug.onDidTerminateDebugSession(DebuggerService.TryToRemoveDisconnectedDebugSession));
    this.disposables.add(debug.onDidStartDebugSession(DebuggerService.AddDebugSession));
  }

  /**
   * A list of all disposables.
   *
   * @private
   * @type {Set<Disposable>}
   * @memberof DebuggerService
   */
  private disposables: Set<Disposable>;

  /**
   * Adds real active debug session in cache when it starts
   *
   * @private
   * @static
   * @param {vscode.DebugSession} session
   * @memberof DebuggerService
   */
  private static AddDebugSession(session: vscode.DebugSession): void {
    DotNetAutoAttach.Cache.RunningDebugs.forEach((k, v) => {
      if (v.name === session.name) {
        DotNetAutoAttach.Cache.RunningDebugs.setValue(k, session);
      }
    });
  }

  /**
   * Try's to remove deconnected debugging sessions.
   *
   * @private
   * @static
   * @param {vscode.DebugSession} session
   * @memberof DebuggerService
   */
  private static TryToRemoveDisconnectedDebugSession(session: vscode.DebugSession): void {
    DotNetAutoAttach.Cache.RunningDebugs.forEach((k, v) => {
      if (v.name === session.name) {
        setTimeout(() => {
          DotNetAutoAttach.Cache.RunningDebugs.remove(k);
          DotNetAutoAttach.Cache.DisconnectedDebugs.add(k);
        }, 2000);
      }
    });
  }

  /**
   * Disconnects the running debug session with the given id.
   *
   * @private
   * @param {number} debugSessionId
   * @memberof DebuggerService
   */
  private DisconnectDebugger(debugSessionId: number): void {
    // Disconnect old debug
    const debugSession = DotNetAutoAttach.Cache.RunningDebugs.getValue(debugSessionId);
    if (debugSession) {
      console.log(debugSession);
      DotNetAutoAttach.Cache.RunningDebugs.remove(debugSessionId);
      debugSession.customRequest("disconnect");
    }
  }

  /**
   * Search for old debug session without runned processes.
   * It happens when debugger stops on breakpoint and code changes with watch restart
   *
   * @param {Array<number>} matchedPids
   * @memberof DebuggerService
   */
  public DisconnectOldDotNetDebugger(matchedPids: Array<number>) {
    // If matched processes does not have running debugs then we need to kill this debug
    DotNetAutoAttach.Cache.RunningDebugs.keys().forEach((runningDebug) => {
      if (matchedPids.indexOf(runningDebug) < 0) {
        this.DisconnectDebugger(runningDebug);
      }
    });
  }

  /**
   * Attaches the dotnet debugger to a specific process.
   *
   * @param {number} pid
   * @param {vscode.DebugConfiguration} baseConfig
   * @memberof DebuggerService
   */
  public AttachDotNetDebugger(pid: number, baseConfig: vscode.DebugConfiguration, path: string): void {
    const task = DotNetAutoAttach.Cache.RunningAutoAttachTasks.values().find((t) =>
      path.startsWith(t.ProjectFolderPath)
    );
    if (
      !DotNetAutoAttach.Cache.RunningDebugs.containsKey(pid) &&
      !DotNetAutoAttach.Cache.DisconnectedDebugs.has(pid) &&
      task
    ) {
      baseConfig.processId = String(pid);
      baseConfig.name = task.Project + " - " + baseConfig.name + " - " + baseConfig.processId;
      DotNetAutoAttach.Cache.RunningDebugs.setValue(pid, {
        name: baseConfig.name,
      } as vscode.DebugSession);
      vscode.debug.startDebugging(undefined, baseConfig);
    } else if (DotNetAutoAttach.Cache.DisconnectedDebugs.has(pid) && task) {
      DotNetAutoAttach.Cache.RunningDebugs.setValue(pid, {
        name: "",
      } as vscode.DebugSession);
      DotNetAutoAttach.Cache.DisconnectedDebugs.delete(pid);
      task.Terminate();
      setTimeout(() => {
        DotNetAutoAttach.Cache.RunningDebugs.remove(pid);
      }, 50);
    }
  }

  /**
   * Dispose
   *
   * @memberof DebuggerService
   */
  public dispose(): void {
    this.disposables.forEach((k) => {
      k.dispose();
    });
    this.disposables.clear();
  }
}
