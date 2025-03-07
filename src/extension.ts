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
