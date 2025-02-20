import { clearInterval, setInterval } from "timers";
import { DebugConfiguration, Disposable } from "vscode";
import * as vscode from "vscode";
import DotNetWatch from "../dotNetWatch";
import ProcessDetail from "../models/ProcessDetail";
import * as fsPath from "path";
import UiService from "./ui-service";

export default class AttachService implements Disposable {
	public constructor() {
		this.disposables = new Set<Disposable>();
		this.timer = undefined;
	}

	public static readonly processPathDiscriminator = ["", "bin", "Debug"].join(fsPath.sep);
	private disposables: Set<Disposable>;
	private timer: NodeJS.Timer | undefined;
	private static interval = 1000;
	private alwaysReattachCml = "";
	private answer = "";

	private static GetDefaultConfig(): DebugConfiguration {
		return {
			type: "coreclr",
			request: "attach",
			name: ".NET Watch",
		};
	}

	public StartTimer(): void {
		if (this.timer !== undefined) {
			return;
		}
		this.timer = setInterval(async () => {
			await this.ScanToAttachAutoTask();
		}, AttachService.interval);
	}

	public StopTimer(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
			this.answer = ""; //reset user's preference
		}
	}

	private async ScanToAttachAutoTask(): Promise<void> {
		// Get processes to scan for attaching
		const processesToScan = Array.from(DotNetWatch.Cache.RunningAutoAttachTasks.values())
			.filter(task => task?.ProcessId)
			.flatMap(task => task?.ProcessId ? DotNetWatch.ProcessService.GetProcesses(task.ProcessId.toString()) : []);

		// Get .NET watch processes
		const watchProcesses = DotNetWatch.ProcessService.GetDotNetWatchProcesses();
		const matchedExternalProcess = watchProcesses.find(p =>
			Array.from(DotNetWatch.Cache.ExternalDotnetWatchProcesses.values()).some(wp => wp.cml === p.cml)
		);

		const updateExternalProcesses = (process: ProcessDetail) => {
			// Update external processes cache
			DotNetWatch.Cache.ExternalDotnetWatchProcesses.clear();
			DotNetWatch.Cache.ExternalDotnetWatchProcesses.setValue(process.pid, process);
		};

		if (matchedExternalProcess && matchedExternalProcess.pid !== DotNetWatch.Cache.ExternalDotnetWatchProcesses.getValue(matchedExternalProcess.pid)?.pid) {
			if (this.alwaysReattachCml === matchedExternalProcess.cml) {
				updateExternalProcesses(matchedExternalProcess);
			} else {
				this.StopTimer();
				// Show reattach prompt to the user
				this.answer = await UiService.ShowReattachPrompt(matchedExternalProcess) || "";
				if (this.answer === "Always") {
					this.alwaysReattachCml = matchedExternalProcess.cml;
					updateExternalProcesses(matchedExternalProcess);
					DotNetWatch.AttachService.StartTimer();
				} else if (this.answer === "Yes, once") {
					updateExternalProcesses(matchedExternalProcess);
					DotNetWatch.AttachService.StartTimer();
				}
			}
		}

		// Filter matched processes
		const matchedProcesses = processesToScan.concat(matchedExternalProcess ? [matchedExternalProcess] : [])
			.filter(p => p.cml.includes(AttachService.processPathDiscriminator) && this.CheckForWorkspace(p))
			.filter((p, index, self) => self.findIndex(t => t.pid === p.pid) === index)
			.filter(p => !DotNetWatch.Cache.RunningDebugs.keys().includes(p.pid));

		if (matchedProcesses.length === 1) {
			// Attach to the process if only one matched
			await this.AttachToProcess(matchedProcesses[0]);
		}

		if (matchedProcesses.length > 0) {
			// Disconnect old .NET debuggers
			DotNetWatch.DebugService.DisconnectOldDotNetDebugger(matchedProcesses.map(p => p.pid));
		}
	}

	public async AttachToProcess(process: ProcessDetail): Promise<void> {
		// Extract path from process command line
		const pathRgx = /(.*)(run|--launch-profile.+|)/g;
		const matches = pathRgx.exec(process.cml);
		let path = "";
		if (matches && matches.length === 3) {
			path = matches[1];
		}

		// Attach .NET debugger to the process
		DotNetWatch.DebugService.AttachDotNetDebugger(
			process.pid,
			AttachService.GetDefaultConfig(),
			path
		);
	}

	private CheckForWorkspace(process: ProcessDetail): boolean {
		// Check if the process belongs to the current workspace
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
		// Dispose all disposables and stop the timer
		this.disposables.forEach((k) => {
			k.dispose();
		});
		this.StopTimer();
		this.disposables.clear();
		this.timer = undefined;
	}
}
