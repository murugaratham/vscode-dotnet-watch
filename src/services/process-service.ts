import * as child_process from "child_process";
import ProcessDetail from "../models/ProcessDetail";
import { Disposable, EventEmitter, Event } from "vscode";
import * as fsPath from "path";

type WindowsProcessDto = {
	ProcessId: number;
	ParentProcessId: number;
	CommandLine: string | null;
};

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
		if(ppid !== "" && Number.isNaN(parseInt(ppid))) return [];

    // Compose the PowerShell command
    let psCommand = "@(Get-CimInstance -ClassName Win32_Process";

    if (ppid !== "") {
        psCommand += ` -Filter "ParentProcessId=${ppid}"`;
    }

		psCommand += " | Select-Object -Property ProcessId,ParentProcessId,CommandLine -ExpandProperty CommandLine) | ConvertTo-Json -Compress";

		// Execute the PowerShell command
    const output = child_process.execFileSync("powershell.exe", ["-Command", psCommand], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });

		if (output.length === 0)  return [];

		// Parse command output
		const pd = <WindowsProcessDto[]>JSON.parse(output, (key, value) => (key === "ProcessId" || key === "ParentProcessId") ? parseInt(value) : value);

		const processDetails = Array.from(pd).map<ProcessDetail>((d) => ({
			pid: d.ProcessId,
			ppid: d.ParentProcessId,
			cml: d.CommandLine ?? ""
		}));

		// Recursively get child processes if a parent process ID is provided
    if (processDetails.length !== 0 && ppid !== "") {
      const childs = processDetails.flatMap((k) => this.getParentProcessDetailsFromWindows(k.pid.toString()));
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
		if(pid !== "" && Number.isNaN(parseInt(pid))) return [];

		// Compose the PowerShell command
    let psCommand = "@(Get-CimInstance -ClassName Win32_Process";

    if (pid !== "") {
        psCommand += ` -Filter "ProcessId=${pid}"`;
    }

    psCommand += " | Select-Object -Property ProcessId,ParentProcessId,CommandLine -ExpandProperty CommandLine) | ConvertTo-Json -Compress";

		// Execute the PowerShell command
    const output = child_process.execFileSync("powershell.exe", ["-Command", psCommand], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });

		if (output.length === 0) return [];

		// Parse command output
		const pd = <WindowsProcessDto[]>JSON.parse(output, (key, value) => (key === "ProcessId" || key === "ParentProcessId") ? parseInt(value) : value);

    const processDetails = Array.from(pd).map<ProcessDetail>((d) => ({
			pid: d.ProcessId,
			ppid: d.ParentProcessId,
			cml: d.CommandLine ?? ""
		}));

		// Recursively get child processes if a parent process ID is provided
    if (processDetails.length !== 0 && pid !== "") {
      const childs = processDetails.flatMap((k) => this.getParentProcessDetailsFromWindows(k.pid.toString()));
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
