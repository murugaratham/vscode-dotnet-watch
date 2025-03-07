import * as vscode from "vscode";
import { DebugSession, Disposable } from "vscode";
import DotNetWatch from "../dotNetWatch";
import ProcessDetail from "../models/ProcessDetail";
import DotNetWatchTask from "../models/DotNetWatchTask";

export const customDisconnect = "custom-disconnect";

export default class DebuggerService implements Disposable {
	private readonly _onDebugParametersChanged = new vscode.EventEmitter();
	public readonly onDebugParametersChanged = this._onDebugParametersChanged.event;
	private disposables: Set<Disposable>;

	public constructor() {
		this.disposables = new Set<Disposable>();

		vscode.debug.registerDebugAdapterTrackerFactory("*", {
			createDebugAdapterTracker: (session: DebugSession) => ({
				onWillReceiveMessage: (m) => {
					if (m.command === "disconnect") {
						if (m.arguments?.customDisconnect === "") {
							if (DotNetWatch.Cache.RunningDebugs.size === 0) {
								DotNetWatch.AttachService.StopAutoAttachScanner();
							}
							this.tryToRemoveDisconnectedDebugAndTerminateSession(session);
						} else {
							const watchProcesses = DotNetWatch.ProcessService.GetDotNetWatchProcesses();
							const cachedExternalProcess = Array.from(DotNetWatch.Cache.ExternalDotnetWatchProcesses.values());

							const userDisconnect = watchProcesses.some(p =>
								cachedExternalProcess.some((wp: ProcessDetail) => wp.cml === p.cml)
							);

							if (userDisconnect) {
								this.tryToRemoveDisconnectedDebugAndTerminateSession(session);
								DotNetWatch.AttachService.StopAutoAttachScanner();
							}
							if (DotNetWatch.Cache.RunningDebugs.size === 0) {
								DotNetWatch.AttachService.StopAutoAttachScanner();
							}
						}
					} else if (m.command === "attach") {
						this.addDebugSession(session);
					}

					this._onDebugParametersChanged.fire({});
				}
			})
		});
	}

	private addDebugSession(session: vscode.DebugSession): void {
		for (const [pid, debugSession] of DotNetWatch.Cache.iterateDebugSessions()) {
			if (debugSession.name === session.name) {
				DotNetWatch.Cache.addRunningDebugSession(pid, session);
			}
		}
	}

	private tryToRemoveDisconnectedDebugAndTerminateSession(session: vscode.DebugSession): void {
		for (const [pid, debugSession] of DotNetWatch.Cache.iterateDebugSessions()) {
			if (debugSession.name === session.name) {
				this.disconnectAndTerminateTask(pid, session.name);
				break;
			}
		}
	}

	public disconnectAndTerminateTask(pid: number, sessionName: string): void {
		DotNetWatch.Cache.removeDebugSession(pid);
		DotNetWatch.Cache.addDisconnectedDebug(pid);

		for (const task of DotNetWatch.Cache.iterateAutoAttachTasks()) {
			if (task?.Project && sessionName.toLowerCase().startsWith(task.Project.toLowerCase())) {
				DotNetWatch.Cache.removeAutoAttachTask(sessionName);
				if (typeof task.Terminate === "function") {
					task.Terminate();
				}
				break;
			}
		}
	}

	public isTaskSpawnedByUs(pid: number, ppid: number): boolean {
		for (const task of DotNetWatch.Cache.iterateAutoAttachTasks()) {
			if (task?.WatchProcessId === pid || task?.WatchProcessId === ppid) {
				return true;
			}
		}
		return false;
	}

	public DisconnectDebugger(pid: number): void {
		const session = DotNetWatch.Cache.getDebugSession(pid);
		if (session) {
			session.customRequest("disconnect", { customDisconnect: "" });
		}
	}

	public AttachDotNetDebugger(pid: number, baseConfig: vscode.DebugConfiguration, path: string): void {
		const task = this.findTaskByPath(path);
		const process = DotNetWatch.Cache.getExternalProcess(pid);
		const isEligible = !DotNetWatch.Cache.hasDebugSession(pid) && !DotNetWatch.Cache.hasDisconnectedDebug(pid);

		if (isEligible && task) {
			this.startDebugging(pid, baseConfig, task.Project);
		} else if (DotNetWatch.Cache.hasDisconnectedDebug(pid) && task) {
			DotNetWatch.Cache.removeDebugSession(pid);
			DotNetWatch.Cache.removeDisconnectedDebug(pid);
			if (typeof task.Terminate === "function") {
				task.Terminate();
			}
		} else if (process && !DotNetWatch.Cache.hasDebugSession(pid)) {
			this.startDebugging(pid, baseConfig, process.cml);
		}
	}

	private findTaskByPath(path: string): DotNetWatchTask | undefined {
		const cleanedPath = path.replace(/^"(.*)"$/, "$1"); // Remove both leading & trailing quotes
		for (const task of DotNetWatch.Cache.iterateAutoAttachTasks()) {
			if (task?.ProjectFolderPath && cleanedPath.startsWith(task.ProjectFolderPath)) {
				return task;
			}
		}
		return undefined;
	}

	private startDebugging(pid: number, baseConfig: vscode.DebugConfiguration, projectName: string): void {
		baseConfig.processId = pid.toString(10);
		baseConfig.name = `${projectName} - ${baseConfig.name}`;

		if (!DotNetWatch.Cache.hasDebugSession(pid)) {
			DotNetWatch.Cache.addRunningDebugSession(pid, { name: baseConfig.name } as vscode.DebugSession);
		}

		vscode.debug.startDebugging(undefined, baseConfig);
		DotNetWatch.AttachService.StartAutoAttachScanner();
	}

	public dispose(): void {
		this.disposables.forEach((k) => k.dispose());
		this.disposables.clear();
		this._onDebugParametersChanged.dispose();
	}
}
