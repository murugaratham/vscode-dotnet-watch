/*
 * @file Contains the DotNetWatch base class.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-16 15:41:58
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2019-02-02 10:43:19
 */

import * as vscode from "vscode";
import { Disposable } from "vscode";
import DotNetWatchDebugConfigurationProvider from "./dotNetWatchDebugConfigurationProvider";
import AttachService from "./services/attach-service";
import CacheService from "./services/cache-service";
import DebuggerService from "./services/debugger-service";
import ProcessService from "./services/process-service";
import TaskService from "./services/task-service";
import UiService from "./services/ui-service";

/**
 * The DotNetWatch base class, contains instances of all it's services.
 *
 * @export
 * @class DotNetWatch
 * @implements {Disposable}
 */
export default class DotNetWatch implements Disposable {
  /**
   * The CacheService. Provides access to the central cache.
   *
   * @static
   * @type {CacheService}
   * @memberof DotNetWatch
   */

  public static readonly Cache: CacheService = new CacheService();
  /**
   * The TaskService, provides functions to manage tasks.
   *
   * @static
   * @type {TaskService}
   * @memberof DotNetWatch
   */
  public static readonly TaskService: TaskService = new TaskService();

  /**
   * The DebuggerService. Provide functionality for starting, and manageing debug sessions.
   *
   * @static
   * @type {DebuggerService}
   * @memberof DotNetWatch
   */
  public static readonly DebugService: DebuggerService = new DebuggerService();

  /**
   * The ProcessService. Provides functionality to scan and parse processes running.
   *
   * @static
   * @type {ProcessService}
   * @memberof DotNetWatch
   */
  public static readonly ProcessService: ProcessService = new ProcessService();

  /**
   * The AttachService.
   *
   * @static
   * @type {AttachService}
   * @memberof DotNetWatch
   */
  public static readonly AttachService: AttachService = new AttachService();

  /**
   * The UiService.
   *
   * @static
   * @type {UiService}
   * @memberof DotNetWatch
   */
  public static readonly UiService: UiService = new UiService();

  /**
   * A list of all disposables.
   *
   * @private
   * @static
   * @type {Set<Disposable>}
   * @memberof DotNetWatch
   */
  private static disposables: Set<Disposable> = new Set<Disposable>();

  /**
   * Start the DotNetWatch.
   *
   * @static
   * @memberof DotNetWatch
   */
  public static Start(): void {
    this.disposables.add(
      vscode.debug.registerDebugConfigurationProvider("DotNetWatch", new DotNetWatchDebugConfigurationProvider())
    );
    this.AttachService.StartTimer();
  }

  /**
   * Stop the DotNetWatch.
   *
   * @static
   * @memberof DotNetWatch
   */
  public static Stop(): void {
    this.AttachService.StopTimer();

    DotNetWatch.disposables.forEach((d) => {
      d.dispose();
    });

    DotNetWatch.disposables.clear();

    DotNetWatch.Cache.dispose();
    DotNetWatch.DebugService.dispose();
    DotNetWatch.UiService.dispose();
  }

  /**
   * Dispose.
   *
   * @memberof DotNetWatch
   */
  public dispose() {
    DotNetWatch.Cache.dispose();
    DotNetWatch.DebugService.dispose();
    DotNetWatch.TaskService.dispose();
    DotNetWatch.ProcessService.dispose();
    DotNetWatch.AttachService.dispose();
    DotNetWatch.UiService.dispose();

    DotNetWatch.disposables.forEach((d) => {
      d.dispose();
    });

    DotNetWatch.disposables.clear();
  }
}
