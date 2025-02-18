export default class ProcessDetail {
	public constructor(pid: number | string, ppid: number | string, cml: string) {
		if (typeof pid === "string") {
			this.pid = Number(pid);
		} else {
			this.pid = pid;
		}
		if (typeof ppid === "string") {
			this.ppid = Number(ppid);
		} else {
			this.ppid = ppid;
		}

		this.cml = cml;
	}

	public pid: number;
	public ppid: number;
	public cml: string;
}
