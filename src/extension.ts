import * as vscode from 'vscode';
import { DebugConfigProvider } from './dotNetWatchDebugConfigurationProvider';
import DotNetWatch from './dotNetWatch';
import { ProcessTableViewProvider } from './ui/processTableViewProvider';

export function activate(context: vscode.ExtensionContext) {
	try {
		const processTableViewProvider = new ProcessTableViewProvider();
		const registration = vscode.window.registerWebviewViewProvider(
			ProcessTableViewProvider.viewType,
			processTableViewProvider
		);

		context.subscriptions.push(registration);
	} catch (error) {
		console.error('Error during extension activation:', error);
	}

	// Register Debug Configuration Provider
	const debugProvider = new DebugConfigProvider();
	context.subscriptions.push(
		vscode.debug.registerDebugConfigurationProvider("DotNetWatch", debugProvider,
			vscode.DebugConfigurationProviderTriggerKind.Dynamic)
	);

	// Register Debug Adapter Factory
	const debugAdapterFactory = new DotNetWatchDebugAdapterFactory();
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory("DotNetWatch", debugAdapterFactory));

	// Register a task provider
	const taskProvider: vscode.TaskProvider = {
		provideTasks: async () => {
			return [];
		},
		resolveTask: async (task: vscode.Task): Promise<vscode.Task | undefined> => {
			if (task.definition.type === "DotNetWatch") return task;
			return undefined;
		}
	};

	context.subscriptions.push(vscode.tasks.registerTaskProvider('DotNetWatch', taskProvider));
}

export function deactivate() {
	DotNetWatch.Stop();
}


export class DotNetWatchDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(
		session: vscode.DebugSession
	): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		DotNetWatch.AttachService.StartAutoAttachScanner();
		const args = ["watch", "run", ...session.configuration.args];
		const env = { ...session.configuration.env };
		return new vscode.DebugAdapterExecutable("dotnet", args, env);
	}
}
