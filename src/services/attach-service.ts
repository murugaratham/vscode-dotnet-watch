/*
 * @file Contains the AttachService.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-16 18:53:11
 * @Last Modified by: Dmitry Kosinov
 * @Last Modified time: 2019-02-06 16:27:08
 */

import { clearInterval, setInterval } from "timers";
import { DebugConfiguration, Disposable } from "vscode";
import * as vscode from "vscode";
import DotNetWatch from "../dotNetWatch";
import ProcessDetail from "../models/ProcessDetail";

/**
 * The AttachService
 *
 * @export
 * @class AttachService
 */
export default class AttachService implements Disposable {
  /**
   * Creates an instance of AttachService.
   * @memberof AttachService
   */
  public constructor() {
    this.disposables = new Set<Disposable>();
    this.timer = undefined;
  }

  /**
   * The interval between the poll.
   *
   * @private
   * @static
   * @type {number}
   * @memberof AttachService
   */
  private static interval = 1000;

  /**
   * A list of all disposables.
   *
   * @private
   * @type {Set<Disposable>}
   * @memberof AttachService
   */
  private disposables: Set<Disposable>;

  /**
   * The poll timer.
   *
   * @private
   * @type {NodeJS.Timer}
   * @memberof AttachService
   */
  private timer: NodeJS.Timer | undefined;

  /**
   * Get the default DebugConfiguration
   *
   * @private
   * @static
   * @returns {DebugConfiguration}
   * @memberof AttachService
   */
  private static GetDefaultConfig(): DebugConfiguration {
    return {
      type: "coreclr",
      request: "attach",
      name: ".NET Core Attach - AUTO",
    };
  }

  /**
   * Start the timer to scan for attach.
   *
   * @memberof AttachService
   */
  public StartTimer(): void {
    this.timer = setInterval(this.ScanToAttach, AttachService.interval);
  }

  /**
   * Stop the timer to scan for attach.
   *
   * @memberof AttachService
   */
  public StopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * Scan processes if its attachable, then try to attach debugger.
   *
   * @private
   * @memberof AttachService
   */
  private ScanToAttach(): void {
    let processesToScan = new Array<ProcessDetail>();
    const runningTasks = DotNetWatch.Cache.RunningAutoAttachTasks;
    runningTasks.forEach((k, v) => {
      if (v && v.ProcessId) {
        processesToScan = processesToScan.concat(DotNetWatch.ProcessService.GetProcesses(v.ProcessId.toString()));
      }
    });
    const matchedProcesses = new Array<number>();

    processesToScan.forEach((p) => {
      if (p.cml.search("/bin/Debug") !== -1 && DotNetWatch.AttachService.CheckForWorkspace(p)) {
        const pathRgx = /(.*)(run|--launch-profile.+|)/g;
        const matches = pathRgx.exec(p.cml);
        let path = "";
        if (matches && matches.length === 3) {
          path = matches[1];
          matchedProcesses.push(p.pid);
        }

        DotNetWatch.DebugService.AttachDotNetDebugger(p.pid, AttachService.GetDefaultConfig(), path);
      }
    });
    if (matchedProcesses.length > 0) {
      //try detect if it's due to restart
      DotNetWatch.DebugService.DisconnectOldDotNetDebugger(matchedProcesses);
    }
  }

  /**
   * Check the process if it's within the current workspace.
   *
   * @private
   * @static
   * @param {ProcessDetail} process
   * @returns {boolean}
   * @memberof AttachService
   */
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

  /**
   * Dispose.
   *
   * @memberof AttachService
   */
  public dispose(): void {
    this.disposables.forEach((k) => {
      k.dispose();
    });
    this.StopTimer();
  }
}
