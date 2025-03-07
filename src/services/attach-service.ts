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
		this.autoAttachTimer = undefined;
	}

	public readonly processPathDiscriminator = ["", "bin", "Debug"].join(fsPath.sep);
	private disposables: Set<Disposable>;
	private autoAttachTimer: NodeJS.Timer | undefined;
	private static interval = 1000;
	private alwaysReattachCml = "";
	private reattachUserSelection = "";

	private static GetDefaultConfig(): DebugConfiguration {
		return {
			type: "coreclr",
			request: "attach",
			name: ".NET Watch",
		};
	}

	public StartAutoAttachScanner(): void {
		if (this.autoAttachTimer !== undefined) {
			return;
		}
		this.autoAttachTimer = setInterval(async () => {
			await this.ScanToAttachAutoTask();
		}, AttachService.interval);
	}

	public StopAutoAttachScanner(): void {
		if (this.autoAttachTimer) {
			clearInterval(this.autoAttachTimer);
			this.autoAttachTimer = undefined;
			this.reattachUserSelection = ""; //reset user's preference
		}
	}

	public isScanningProcess(): boolean {
		return this.autoAttachTimer !== undefined;
	}

	private async ScanToAttachAutoTask(): Promise<void> {
		console.log("scanning process to attach")

		// Get processes to scan for attaching
		const processesToScan = Array.from(DotNetWatch.Cache.RunningAutoAttachTasks.values())
			.filter(task => task?.WatchProcessId)
			.flatMap(task => task?.WatchProcessId ? DotNetWatch.ProcessService.GetProcessByPpid(task.WatchProcessId.toString()) : []);


		// Get all .NET watch processes
		const watchProcesses = DotNetWatch.ProcessService.GetDotNetWatchProcesses();
		const matchedExternalProcess = watchProcesses.find(p =>
			Array.from(DotNetWatch.Cache.ExternalDotnetWatchProcesses.values()).some(wp => wp.cml === p.cml)
		);

		const updateExternalProcesses = (process: ProcessDetail) => {
			// Update external processes cache
			DotNetWatch.Cache.ExternalDotnetWatchProcesses.clear();
			DotNetWatch.Cache.ExternalDotnetWatchProcesses.set(process.pid, process);
		};

		if (matchedExternalProcess && matchedExternalProcess.pid !== DotNetWatch.Cache.ExternalDotnetWatchProcesses.get(matchedExternalProcess.pid)?.pid) {
			if (this.alwaysReattachCml === matchedExternalProcess.cml) {
				updateExternalProcesses(matchedExternalProcess);
			} else {
				this.StopAutoAttachScanner();
				// Show reattach prompt to the user
				this.reattachUserSelection = await UiService.ShowReattachPrompt(matchedExternalProcess) || "";
				if (this.reattachUserSelection === "Always") {
					this.alwaysReattachCml = matchedExternalProcess.cml;
					updateExternalProcesses(matchedExternalProcess);
					DotNetWatch.AttachService.StartAutoAttachScanner();
				} else if (this.reattachUserSelection === "Yes, once") {
					updateExternalProcesses(matchedExternalProcess);
					DotNetWatch.AttachService.StartAutoAttachScanner();
				} else if (this.reattachUserSelection === "No") {
					DotNetWatch.AttachService.StopAutoAttachScanner();
				}
			}
		}

		// Filter matched processes
		const matchedProcesses = processesToScan.concat(matchedExternalProcess ? [matchedExternalProcess] : [])
			.filter(p => p.cml.includes(this.processPathDiscriminator) && this.CheckForWorkspace(p))
			.filter((p, index, self) => {
				return self.findIndex(t => t.ppid === p.ppid) === index
			})
			.filter(p => {
				return !DotNetWatch.Cache.RunningDebugs.has(p.pid)
			});

		if (matchedProcesses.length === 1) {
			// Attach to the process if only one matched
			await this.AttachToProcess(matchedProcesses[0]);
		}
	}

	public async AttachToProcess(process: ProcessDetail) {
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
		this.StopAutoAttachScanner();
		this.disposables.clear();
		this.autoAttachTimer = undefined;
	}
}
