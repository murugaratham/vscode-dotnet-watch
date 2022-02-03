/*
 * @file Contains the DotNetAutoAttach base class.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-16 15:41:58
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2019-02-02 10:43:19
 */

import * as vscode from "vscode";
import { Disposable } from "vscode";
import DotNetAutoAttachDebugConfigurationProvider from "./dotNetAutoAttachDebugConfigurationProvider";
import AttachService from "./services/attach-service";
import CacheService from "./services/cache-service";
import DebuggerService from "./services/debugger-service";
import ProcessService from "./services/process-service";
import TaskService from "./services/task-service";
import UiService from "./services/ui-service";

/**
 * The DotNetAutoAttach base class, contains instances of all it's services.
 *
 * @export
 * @class DotNetAutoAttach
 * @implements {Disposable}
 */
export default class DotNetAutoAttach implements Disposable {
	/**
	 * The CacheService. Provides access to the central cache.
	 *
	 * @static
	 * @type {CacheService}
	 * @memberof DotNetAutoAttach
	 */

	public static readonly Cache: CacheService = new CacheService();
	/**
	 * The TaskService, provides functions to manage tasks.
	 *
	 * @static
	 * @type {TaskService}
	 * @memberof DotNetAutoAttach
	 */
	public static readonly TaskService: TaskService = new TaskService();

	/**
	 * The DebuggerService. Provide functionality for starting, and manageing debug sessions.
	 *
	 * @static
	 * @type {DebuggerService}
	 * @memberof DotNetAutoAttach
	 */
	public static readonly DebugService: DebuggerService = new DebuggerService();

	/**
	 * The ProcessService. Provides functionality to scan and parse processes running.
	 *
	 * @static
	 * @type {ProcessService}
	 * @memberof DotNetAutoAttach
	 */
	public static readonly ProcessService: ProcessService = new ProcessService();

	/**
	 * The AttachService.
	 *
	 * @static
	 * @type {AttachService}
	 * @memberof DotNetAutoAttach
	 */
	public static readonly AttachService: AttachService = new AttachService();

	/**
	 * The UiService.
	 *
	 * @static
	 * @type {UiService}
	 * @memberof DotNetAutoAttach
	 */
	public static readonly UiService: UiService = new UiService();

	/**
	 * A list of all disposables.
	 *
	 * @private
	 * @static
	 * @type {Set<Disposable>}
	 * @memberof DotNetAutoAttach
	 */
	private static disposables: Set<Disposable> = new Set<Disposable>();

	/**
	 * Start the DotNetAutoAttach.
	 *
	 * @static
	 * @memberof DotNetAutoAttach
	 */
	public static Start(): void {
		// Register AutoAttachDebugConfigurationProvider
		this.disposables.add(
			vscode.debug.registerDebugConfigurationProvider(
				"DotNetAutoAttach",
				new DotNetAutoAttachDebugConfigurationProvider()
			)
		);
		this.AttachService.StartTimer();
	}

	/**
	 * Stop the DotNetAutoAttach.
	 *
	 * @static
	 * @memberof DotNetAutoAttach
	 */
	public static Stop(): void {
		this.AttachService.StopTimer();

		DotNetAutoAttach.disposables.forEach(d => {
			d.dispose();
		});

		DotNetAutoAttach.disposables.clear();

		DotNetAutoAttach.Cache.dispose();
		DotNetAutoAttach.DebugService.dispose();
		DotNetAutoAttach.UiService.dispose();
	}

	/**
	 * Dispose.
	 *
	 * @memberof DotNetAutoAttach
	 */
	public dispose() {
		DotNetAutoAttach.Cache.dispose();
		DotNetAutoAttach.DebugService.dispose();
		DotNetAutoAttach.TaskService.dispose();
		DotNetAutoAttach.ProcessService.dispose();
		DotNetAutoAttach.AttachService.dispose();
		DotNetAutoAttach.UiService.dispose();

		DotNetAutoAttach.disposables.forEach(d => {
			d.dispose();
		});

		DotNetAutoAttach.disposables.clear();
	}
}
