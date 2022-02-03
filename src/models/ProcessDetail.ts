/*
 * @file Contains the ProcessDetail
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-15 19:42:32
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2018-06-15 19:42:32
 */

/**
 * The ProcessDetail class. Represent detail infromation about a process
 *
 * @class ProcessDetail
 */
export default class ProcessDetail {
	/**
	 * Creates an instance of ProcessDetail.
	 * @param {(number | string)} pid The ProcessId.
	 * @param {(number | string)} ppid The ParentProcessId.
	 * @param {string} cml The CommandLine.
	 * @memberof ProcessDetail
	 */
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
	/**
	 * The ProcessId of the process.
	 *
	 * @type {number}
	 * @memberof ProcessDetail
	 */
	public pid: number;
	/**
	 * The ParentProcessId of the process.
	 *
	 * @type {number}
	 * @memberof ProcessDetail
	 */
	public ppid: number;
	/**
	 * The CommandLine of the process.
	 *
	 * @type {string}
	 * @memberof ProcessDetail
	 */
	public cml: string;
}
