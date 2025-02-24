import * as vscode from 'vscode';
import { DotNetWatchDebugConfigurationProvider } from './dotNetWatchDebugConfigurationProvider';
import DotNetWatch from './dotNetWatch';

export function activate(context: vscode.ExtensionContext) {
	const channel = vscode.window.createOutputChannel('.NET Watch');

	// Register debug configuration provider
	const provider = new DotNetWatchDebugConfigurationProvider();
	context.subscriptions.push(
		vscode.debug.registerDebugConfigurationProvider("DotNetWatch", provider,
			vscode.DebugConfigurationProviderTriggerKind.Dynamic)
	);
	DotNetWatch.Start();
	channel.appendLine('Extension activated');
	channel.appendLine('Registered debug configuration provider');
}
export function deactivate() {
	DotNetWatch.Stop();
}
