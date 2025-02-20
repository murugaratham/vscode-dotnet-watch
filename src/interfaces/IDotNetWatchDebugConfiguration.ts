import { DebugConfiguration, WorkspaceFolder } from "vscode";

export default interface IDotNetWatchDebugConfiguration extends DebugConfiguration {
	workspace: WorkspaceFolder;
	args: Array<string>;
	env?: { [key: string]: string };
	project: string;
}
