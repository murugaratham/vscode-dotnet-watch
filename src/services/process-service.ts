import * as child_process from "child_process";
import * as fsPath from "path";
import { Disposable, EventEmitter, Event } from "vscode";
import ProcessDetail from "../models/ProcessDetail";

export default class ProcessService implements Disposable {
	// Events
	private readonly _onProcessesUpdated = new EventEmitter<ProcessDetail[]>();
	public readonly onProcessesUpdated: Event<ProcessDetail[]> = this._onProcessesUpdated.event;

	private readonly _onScanningStateChanged = new EventEmitter();
	public readonly onScanningStateChanged = this._onScanningStateChanged.event;

	// Configuration
	private readonly scanInterval: number = 1000; // TODO: Make this configurable via user settings
	private readonly processPathDiscriminator = fsPath.join("", "bin", "Debug");

	// State
	private previousProcesses: ProcessDetail[] = [];
	private processScannerTimer?: NodeJS.Timer;

	constructor() {
		this.StartProcessScanner();
	}

	dispose(): void {
		this.StopProcessScanner();
		this._onProcessesUpdated.dispose();
		this._onScanningStateChanged.dispose();
	}

	// Public API
	public TriggerProcessesUpdate(processes: ProcessDetail[]): void {
		this._onProcessesUpdated.fire(processes);
	}

	public StartProcessScanner(): void {
		if (this.processScannerTimer) return;

		this.processScannerTimer = setInterval(() => {
			const processes = this.GetDotNetWatchProcesses();
			if (!this.areProcessListsEqual(processes, this.previousProcesses)) {
				this.previousProcesses = processes;
				this._onProcessesUpdated.fire(processes);
			}
		}, this.scanInterval);
		this._onScanningStateChanged.fire({});
	}

	public StopProcessScanner(): void {
		if (this.processScannerTimer) {
			clearInterval(this.processScannerTimer);
			this.processScannerTimer = undefined;
			this.previousProcesses = [];
			this._onScanningStateChanged.fire({});
		}
	}

	public IsScanningProcesses(): boolean {
		return this.processScannerTimer !== undefined;
	}

	public GetProcesses(): ProcessDetail[] {
		return this.isWindows() ? this.GetWindowsProcesses() : this.GetUnixProcesses();
	}

	public GetProcessByParentId(ppid: string): ProcessDetail[] {
		return this.isWindows() ? this.GetWindowsProcesses(ppid, true) : this.GetUnixProcesses(ppid, true);
	}

	public GetProcessById(pid: string): ProcessDetail[] {
		return this.isWindows() ? this.GetWindowsProcesses(pid, false) : this.GetUnixProcesses(pid, false);
	}

	public GetDotNetWatchProcesses(): ProcessDetail[] {
		const processes = this.GetProcesses();
		return processes.filter(p => p.cml.includes(this.processPathDiscriminator));
	}

	// Private methods
	private areProcessListsEqual(list1: ProcessDetail[], list2: ProcessDetail[]): boolean {
		return JSON.stringify(list1) === JSON.stringify(list2);
	}

	private isWindows(): boolean {
		return process.platform === "win32";
	}

	private GetUnixProcesses(identifier = "", filterByParent = true): ProcessDetail[] {
		try {
			const cmd = "ps -o pid,ppid,command";
			const output = child_process.execSync(cmd).toString();
			const processDetails: ProcessDetail[] = [];

			const processLines = output
				.split("\n")
				.map(line => line.trim())
				.filter(line => /^(\d+)\s+(\d+)\s(.+)$/.test(line));

			for (const line of processLines) {
				const match = /^(\d+)\s+(\d+)\s(.+)$/.exec(line);
				if (match) {
					const [, pid, ppid, command] = match;
					if (!identifier || (filterByParent ? ppid === identifier : pid === identifier)) {
						processDetails.push(new ProcessDetail(pid, ppid, command));
					}
				}
			}

			// Recursively Get child processes
			return identifier
				? [...processDetails, ...processDetails.flatMap(proc =>
					this.GetUnixProcesses(proc.pid + "", filterByParent))]
				: processDetails;
		} catch (error) {
			console.error("Error Getting Unix processes:", error);
			return [];
		}
	}

	private GetWindowsProcesses(identifier = "", filterByParent = true): ProcessDetail[] {
		try {
			let command = "Get-CimInstance -ClassName Win32_Process";
			if (identifier) {
				command += ` -Filter "${filterByParent ? "ParentProcessId" : "ProcessId"}=${identifier}"`;
			}
			command += " | Select-Object ProcessId, ParentProcessId, CommandLine | Format-Table -HideTableHeaders";

			const output = child_process.execFileSync("powershell.exe", ["-Command", command], { encoding: "utf8" });
			const processDetails: ProcessDetail[] = [];

			const processLines = output.trim().split("\r\n");
			for (const line of processLines) {
				const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
				if (match) {
					const [, pid, parentPid, commandLine] = match;
					processDetails.push(new ProcessDetail(pid, parentPid, commandLine));
				}
			}

			// Recursively Get child processes
			return identifier
				? [...processDetails, ...processDetails.flatMap(proc =>
					this.GetWindowsProcesses(proc.pid + "", filterByParent))]
				: processDetails;
		} catch (error) {
			console.error("Error Getting Windows processes:", error);
			return [];
		}
	}
}
