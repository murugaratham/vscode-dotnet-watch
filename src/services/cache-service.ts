import { DebugSession, Disposable } from "vscode";
import DotNetWatchTask from "../models/DotNetWatchTask";
import ProcessDetail from "../models/ProcessDetail";

export default class CacheService implements Disposable {
	public constructor() {
		this.RunningAutoAttachTasks = new Map<string, DotNetWatchTask>();
		this.RunningDebugs = new Map<number, DebugSession>();
		this.DisconnectedDebugs = new Set<number>();
		this.ExternalDotnetWatchProcesses = new Map<number, ProcessDetail>();
	}

	public RunningAutoAttachTasks: Map<string, DotNetWatchTask | undefined>;
	public RunningDebugs: Map<number, DebugSession>;
	public DisconnectedDebugs: Set<number>;
	public ExternalDotnetWatchProcesses: Map<number, ProcessDetail>;

	public dispose() {
		this.RunningAutoAttachTasks.forEach(v => v?.Terminate());
		this.RunningAutoAttachTasks.clear();
		this.RunningDebugs.clear();
		this.DisconnectedDebugs.clear();
		this.ExternalDotnetWatchProcesses.clear();
	}

	public getDebugSession(pid: number): DebugSession | undefined {
		return this.RunningDebugs.get(pid);
	}

	public getExternalProcess(pid: number): ProcessDetail | undefined {
		return this.ExternalDotnetWatchProcesses.get(pid);
	}

	public hasDebugSession(pid: number): boolean {
		return this.RunningDebugs.has(pid);
	}

	public hasDisconnectedDebug(pid: number): boolean {
		return this.DisconnectedDebugs.has(pid);
	}

	public removeDebugSession(pid: number): void {
		this.RunningDebugs.delete(pid);
	}

	public addDisconnectedDebug(pid: number): void {
		this.DisconnectedDebugs.add(pid);
	}

	public removeDisconnectedDebug(pid: number): void {
		this.DisconnectedDebugs.delete(pid);
	}

	public addRunningDebugSession(pid: number, session: DebugSession): void {
		this.RunningDebugs.set(pid, session);
	}

	public *iterateDebugSessions(): IterableIterator<[number, DebugSession]> {
		yield* this.RunningDebugs.entries();
	}

	public *iterateAutoAttachTasks(): IterableIterator<DotNetWatchTask | undefined> {
		yield* this.RunningAutoAttachTasks.values();
	}

	public removeAutoAttachTask(key: string): void {
		this.RunningAutoAttachTasks.delete(key);
	}
}
