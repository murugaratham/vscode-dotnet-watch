import { debug } from "vscode";
import * as vscode from 'vscode';
import { DebugSession, Disposable } from "vscode";
import DotNetWatch from "../dotNetWatch";
import ProcessDetail from "../models/ProcessDetail";
import DotNetWatchTask from "../models/DotNetWatchTask";

export default class DebuggerService implements Disposable {
	private disposables: Set<Disposable>;
	private readonly _onDebugParametersChanged = new vscode.EventEmitter();
	public readonly onDebugParametersChanged = this._onDebugParametersChanged.event;

	public constructor() {
		this.disposables = new Set<Disposable>();
		this.disposables.add(debug.onDidTerminateDebugSession(this.removeDebugSession));

		vscode.debug.registerDebugAdapterTrackerFactory("*", {
			createDebugAdapterTracker: (session: DebugSession) => ({
				onWillReceiveMessage: (m) => {
					if (m.command === "detach") {
						this.tryToRemoveDisconnectedDebugAndTerminateSession(session);
						this._onDebugParametersChanged.fire({});
					} else if (m.command === "disconnect") {
						const watchProcesses = DotNetWatch.ProcessService.GetDotNetWatchProcesses();
						const cachedExternalProcess = Array.from(DotNetWatch.Cache.ExternalDotnetWatchProcesses.values());
						const userDetachInsteadOfCtrlR = watchProcesses.some(p =>
							cachedExternalProcess.some((wp: ProcessDetail) => wp.cml === p.cml)
						);
						if (userDetachInsteadOfCtrlR) {
							this.tryToRemoveDisconnectedDebugAndTerminateSession(session);
						}
					} else if (m.command === "attach") {
						this.addDebugSession(session);
						this._onDebugParametersChanged.fire({});
					}
				}
			})
		});
	}

	private removeDebugSession(session: DebugSession) {
		for (const [pid, debugSession] of DotNetWatch.Cache.iterateDebugSessions()) {
			if (debugSession.name === session.name) {
				DotNetWatch.Cache.removeDebugSession(pid);
				DotNetWatch.Cache.addDisconnectedDebug(pid);
			}
		}
		DotNetWatch.DebugService.TriggerDebugParametersChange();
	}

	// Public API
	public TriggerDebugParametersChange(): void {
		this._onDebugParametersChanged.fire({});
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
				this.disconnectAndTerminateTask(pid);
				break;
			}
		}
	}

	public disconnectAndTerminateTask(pid: number): void {
		const session = DotNetWatch.Cache.getDebugSession(pid);
		for (const task of DotNetWatch.Cache.iterateAutoAttachTasks()) {
			if (task?.Project && session?.name.toLowerCase().startsWith(task.Project.toLowerCase())) {
				DotNetWatch.Cache.removeAutoAttachTask(session.name);
				task.Terminate();
				break;
			}
		}

		session?.customRequest("disconnect");
	}

	public AttachDotNetDebugger(pid: number, baseConfig: vscode.DebugConfiguration, path: string): void {
		const task = this.findTaskByPath(path);
		const process = DotNetWatch.Cache.getExternalProcess(pid);
		const isEligible = !DotNetWatch.Cache.hasDebugSession(pid) && !DotNetWatch.Cache.hasDisconnectedDebug(pid);

		if (isEligible && task) {
			this.startDebugging(pid, baseConfig, task.Project);
		} else if (DotNetWatch.Cache.hasDisconnectedDebug(pid)) {
			if (task) task.Terminate();
			DotNetWatch.Cache.ExternalDotnetWatchProcesses.delete(pid);
			DotNetWatch.Cache.DisconnectedDebugs.delete(pid);
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
		this.disposables.forEach((k) => {
			k.dispose();
		});
		this.disposables.clear();
		this._onDebugParametersChanged.dispose();
	}
}
