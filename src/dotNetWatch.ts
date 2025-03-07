import * as vscode from "vscode";
import { Disposable } from "vscode";
import { DotNetWatchDebugConfigurationProvider } from "./dotNetWatchDebugConfigurationProvider";
import AttachService from "./services/attach-service";
import CacheService from "./services/cache-service";
import DebuggerService from "./services/debugger-service";
import ProcessService from "./services/process-service";
import TaskService from "./services/task-service";
import UiService from "./services/ui-service";

export default class DotNetWatch implements Disposable {
	public static readonly Cache: CacheService = new CacheService();
	public static readonly TaskService: TaskService = new TaskService();
	public static readonly DebugService: DebuggerService = new DebuggerService();
	public static readonly ProcessService: ProcessService = new ProcessService();
	public static readonly AttachService: AttachService = new AttachService();
	public static readonly UiService: UiService = new UiService();
	private static disposables: Set<Disposable> = new Set<Disposable>();

	public static Start(): void {
		this.disposables.add(
			vscode.debug.registerDebugConfigurationProvider("DotNetWatch", new DotNetWatchDebugConfigurationProvider())
		);
	}

	// Centralize cleanup in a single method.
	private static cleanUp(): void {
		DotNetWatch.Cache.dispose();
		DotNetWatch.DebugService.dispose();
		DotNetWatch.TaskService.dispose();
		DotNetWatch.AttachService.dispose();
		DotNetWatch.ProcessService.dispose();
		DotNetWatch.UiService.dispose();
		DotNetWatch.disposables.forEach((d) => d.dispose());
		DotNetWatch.disposables.clear();
	}

	public static Stop(): void {
		this.cleanUp();
	}

	public dispose(): void {
		DotNetWatch.cleanUp();
	}
}
