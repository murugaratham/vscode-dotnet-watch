import * as vscode from 'vscode';
import { DotNetWatchDebugConfigurationProvider } from './dotNetWatchDebugConfigurationProvider';
import DotNetWatch from './dotNetWatch';
import { ProcessTableViewProvider } from './ui/processTableViewProvider';

export function activate(context: vscode.ExtensionContext) {
	try {
		// Create and register the view provider
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
	const debugProvider = new DotNetWatchDebugConfigurationProvider();
	context.subscriptions.push(
		vscode.debug.registerDebugConfigurationProvider("DotNetWatch", debugProvider,
			vscode.DebugConfigurationProviderTriggerKind.Dynamic)
	);

	// ✅ Register Debug Adapter Factory
	const debugAdapterFactory = new DotNetWatchDebugAdapterFactory();
	context.subscriptions.push(
		vscode.debug.registerDebugAdapterDescriptorFactory("DotNetWatch", debugAdapterFactory)
	);

	// Register a task provider
	const taskProvider: vscode.TaskProvider = {
		provideTasks: async () => {
			// No static tasks in this case, so return an empty array.
			return [];
		},
		resolveTask: async (task: vscode.Task): Promise<vscode.Task | undefined> => {
			// Resolve task is not really needed as we create the task with all the information already.

			if (task.definition.type === "DotNetWatch") {
				// Here you could add logic to populate the task with more info if needed.
				return task;
			}

			return undefined;
		}
	};

	context.subscriptions.push(vscode.tasks.registerTaskProvider('DotNetWatch', taskProvider));
	DotNetWatch.Start();
}

export function deactivate() {
	DotNetWatch.Stop();
}


export class DotNetWatchDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(
		session: vscode.DebugSession
	): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		// ✅ Start 'dotnet watch' as the debug adapter
		return new vscode.DebugAdapterExecutable("dotnet", ["watch", "run", ...session.configuration.args]);
	}
}
