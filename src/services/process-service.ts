import * as child_process from "child_process";
import ProcessDetail from "../models/ProcessDetail";
import { Disposable, EventEmitter, Event } from "vscode";
import * as fsPath from "path";

export default class ProcessService implements Disposable {
	private readonly _onProcessesUpdated = new EventEmitter<ProcessDetail[]>();
	public readonly onProcessesUpdated: Event<ProcessDetail[]> = this._onProcessesUpdated.event;
	private scanInterval = 5000; // maybe change this to user setting
	private previousProcesses: ProcessDetail[] = [];
	private processScannerTimer: NodeJS.Timer | undefined;
	private readonly _onTimerChanged = new EventEmitter();
	public readonly onTimerChanged = this._onTimerChanged.event;
	private readonly processPathDiscriminator = ["", "bin", "Debug"].join(fsPath.sep);

	constructor() {
		this.startProcessScanner();
	}

	public triggerProcessesUpdate(processes: ProcessDetail[]): void {
		this._onProcessesUpdated.fire(processes);  // Fire the event with the updated processes
	}

	dispose(): void {
		if (this.processScannerTimer) {
			clearInterval(this.processScannerTimer);
		}
		this._onProcessesUpdated.dispose();
	}

	public startProcessScanner(): void {
		this.processScannerTimer = setInterval(() => {
			const processes = this.GetDotNetWatchProcesses();
			if (JSON.stringify(processes) !== JSON.stringify(this.previousProcesses)) {
				this.previousProcesses = processes;
				this._onProcessesUpdated.fire(processes);
			}
		}, this.scanInterval);
		this._onTimerChanged.fire({});
	}

	public StopProcessScanner(): void {
		if (this.processScannerTimer) {
			clearInterval(this.processScannerTimer);
			this.processScannerTimer = undefined;
			this._onTimerChanged.fire({});
		}
	}

	public isScanningProcess(): boolean {
		return this.processScannerTimer !== undefined;
	}

	private GetProcesses(): Array<ProcessDetail> {
		if (process.platform === "win32") {
			return this.getParentProcessDetailsFromWindows();
		} else {
			// unix
			return this.getParentProcessDetailsFromUnix();
		}
	}
	public GetProcessByPpid(ppid: string): Array<ProcessDetail> {
		if (process.platform === "win32") {
			return this.getParentProcessDetailsFromWindows(ppid);
		} else {
			// unix
			return this.getParentProcessDetailsFromUnix(ppid);
		}
	}

	public GetProcessByPid(pid: string): Array<ProcessDetail> {
		if (process.platform === "win32") {
			return this.getProcessDetailsFromWindows(pid);
		} else {
			// unix
			return this.getProcessDetailsFromUnix(pid);
		}
	}

	private getParentProcessDetailsFromUnix(ppid = ""): Array<ProcessDetail> {
		const cmlPattern = /^([0-9]+)\s+([0-9]+)\s(.+$)/;

		// build and execute command line tool "ps" to get details of all running processes
		const args = ["-o pid,ppid,command"];
		const tmp = child_process.execSync(`ps ${args}`).toString();

		// split process informations results for each process
		const processLines = tmp
			.split("\n")
			.map((str) => {
				return str.trim();
			})
			.filter((str) => cmlPattern.test(str));

		// parse output to a ProcessDetail list
		const processDetails = new Array<ProcessDetail>();
		processLines.forEach((str) => {
			const s = cmlPattern.exec(str);
			if (
				s &&
				s.length === 4 && // validate regex result
				(ppid === "" || s[2] === ppid) // i want to check by pid instead of ppid
			) {
				// apply parent process filter
				processDetails.push(new ProcessDetail(s[1], s[2], s[3]));
			}
		});

		//Find nested child processes
		if (processDetails.length !== 0 && ppid !== "") {
			const childs = new Array<ProcessDetail>();
			processDetails.forEach((k) => {
				const tmp = this.getParentProcessDetailsFromUnix(k.pid.toString());
				tmp.forEach((l) => childs.push(l));
			});
			return processDetails.concat(childs);
		}
		return processDetails;
	}

	private getParentProcessDetailsFromWindows(ppid = ""): Array<ProcessDetail> {
		const cmlPattern = /^(.+)\s+([0-9]+)\s+([0-9]+)$/;
		let args = ["process", "get", "ProcessId,ParentProcessId,CommandLine"];
		if (ppid !== "") {
			args = ["process", "where", `parentProcessId = ${ppid}`, "get", "ProcessId,ParentProcessId,CommandLine"];
		}

		const tmp = child_process.execFileSync("wmic.exe", args, {
			encoding: "utf8",
		});

		const processLines = tmp
			.split("\r\n")
			.map((str) => {
				return str.trim();
			})
			.filter((str) => cmlPattern.test(str));

		const processDetails = new Array<ProcessDetail>();
		processLines.forEach((str) => {
			const s = cmlPattern.exec(str);
			if (s && s.length === 4) {
				processDetails.push(new ProcessDetail(s[3], s[2], s[1]));
			}
		});
		if (processDetails.length !== 0 && ppid !== "") {
			const childs = new Array<ProcessDetail>();
			processDetails.forEach((k) => {
				const tmp = this.getParentProcessDetailsFromWindows(k.pid.toString());
				tmp.forEach((l) => childs.push(l));
			});
			return processDetails.concat(childs);
		}
		return processDetails;
	}


	private getProcessDetailsFromUnix(pid = ""): Array<ProcessDetail> {
		const cmlPattern = /^([0-9]+)\s+([0-9]+)\s(.+$)/;

		// build and execute command line tool "ps" to get details of all running processes
		const args = ["-o pid,ppid,command"];
		const tmp = child_process.execSync(`ps ${args}`).toString();

		// split process informations results for each process
		const processLines = tmp
			.split("\n")
			.map((str) => {
				return str.trim();
			})
			.filter((str) => cmlPattern.test(str));

		// parse output to a ProcessDetail list
		const processDetails = new Array<ProcessDetail>();
		processLines.forEach((str) => {
			const s = cmlPattern.exec(str);
			if (
				s &&
				s.length === 4 && // validate regex result
				(pid === "" || s[1] === pid) // i want to check by pid instead of ppid
			) {
				// apply parent process filter
				processDetails.push(new ProcessDetail(s[1], s[2], s[3]));
			}
		});

		//Find nested child processes
		if (processDetails.length !== 0 && pid !== "") {
			const childs = new Array<ProcessDetail>();
			processDetails.forEach((k) => {
				const tmp = this.getParentProcessDetailsFromUnix(k.pid.toString());
				tmp.forEach((l) => childs.push(l));
			});
			return processDetails.concat(childs);
		}
		return processDetails;
	}

	private getProcessDetailsFromWindows(pid = ""): Array<ProcessDetail> {
		const cmlPattern = /^(.+)\s+([0-9]+)\s+([0-9]+)$/;
		let args = ["process", "get", "ProcessId,ParentProcessId,CommandLine"];
		if (pid !== "") {
			args = ["process", "where", `ProcessId = ${pid}`, "get", "ProcessId,ParentProcessId,CommandLine"];
		}

		const tmp = child_process.execFileSync("wmic.exe", args, {
			encoding: "utf8",
		});

		const processLines = tmp
			.split("\r\n")
			.map((str) => {
				return str.trim();
			})
			.filter((str) => cmlPattern.test(str));

		const processDetails = new Array<ProcessDetail>();
		processLines.forEach((str) => {
			const s = cmlPattern.exec(str);
			if (s && s.length === 4) {
				processDetails.push(new ProcessDetail(s[3], s[2], s[1]));
			}
		});
		if (processDetails.length !== 0 && pid !== "") {
			const childs = new Array<ProcessDetail>();
			processDetails.forEach((k) => {
				const tmp = this.getParentProcessDetailsFromWindows(k.pid.toString());
				tmp.forEach((l) => childs.push(l));
			});
			return processDetails.concat(childs);
		}
		return processDetails;
	}

	public GetDotNetWatchProcesses(): Array<ProcessDetail> {
		try {
			const processes = this.GetProcesses();
			return processes.filter(p => p.cml.includes(this.processPathDiscriminator));
		} catch (error) {
			console.error("Error getting dotnet watch processes:", error);
			return [];
		}
	}
}
