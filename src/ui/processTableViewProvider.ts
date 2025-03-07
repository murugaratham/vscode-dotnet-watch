import * as vscode from "vscode";
import DotNetWatch from "../dotNetWatch";
import ProcessDetail from "../models/ProcessDetail";


export class ProcessTableViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "watched-processes";
	private _view?: vscode.WebviewView;
	private processes: ProcessDetail[] = [];

	private static readonly COMMANDS = {
		ATTACH: "attach",
		// DETACH: "detach",
		START_PROCESS_SCANNER: "start-process-scanner",
		STOP_PROCESS_SCANNER: "stop-process-scanner",
		START_AUTO_ATTACH: "start-auto-attach",
		STOP_AUTO_ATTACH: "stop-auto-attach",
		DEBUG_STOP: "debug-stop"
	};

	private static readonly ICONS = {
		DEBUG_STOP: { class: "codicon codicon-debug-stop", tooltip: "Stop Debugger", color: "#f48771" },
		ATTACH: { class: "codicon codicon-debug", tooltip: "Attach Debugger", color: "#89d185" },
		DISCONNECT: { class: "codicon codicon-debug-disconnect", tooltip: "Detach Debugger", color: "#f48771" }
	};

	constructor() {
		DotNetWatch.ProcessService.onProcessesUpdated((updatedProcesses) => {
			this.processes = updatedProcesses;
			this.refresh();
		});
		DotNetWatch.DebugService.onDebugParametersChanged(() => this.refresh());
		DotNetWatch.ProcessService.onTimerChanged(() => this.refresh());
	}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		this._view = webviewView;
		webviewView.webview.options = { enableScripts: true };
		this.refresh();

		webviewView.webview.onDidReceiveMessage((message) => {
			switch (message.command) {
				case ProcessTableViewProvider.COMMANDS.ATTACH: {
					const attachProcess = this.processes.find(p => p.pid === message.pid);
					if (attachProcess) this.tryAttach(attachProcess);
					break;
				}
				case ProcessTableViewProvider.COMMANDS.START_PROCESS_SCANNER:
					DotNetWatch.ProcessService.startProcessScanner();
					break;
				case ProcessTableViewProvider.COMMANDS.STOP_PROCESS_SCANNER:
					DotNetWatch.ProcessService.StopProcessScanner();
					this.refresh(false);
					break;
				case ProcessTableViewProvider.COMMANDS.DEBUG_STOP: {
					const debugProcess = this.processes.find(p => p.pid === message.pid);  // Renamed variable
					if (debugProcess) DotNetWatch.TaskService.removeAndTerminateTaskByProcessId(message.pid)
					break;
				}
				case ProcessTableViewProvider.COMMANDS.START_AUTO_ATTACH:
					DotNetWatch.AttachService.StartAutoAttachScanner();
					break;
				case ProcessTableViewProvider.COMMANDS.STOP_AUTO_ATTACH:
					DotNetWatch.AttachService.StopAutoAttachScanner();
					break;
			}
		});
	}

	tryAttach(p: ProcessDetail) {
		DotNetWatch.Cache.ExternalDotnetWatchProcesses.set(p.pid, p);
		DotNetWatch.AttachService.AttachToProcess(p);
	}

	private getHtml(showProcesses: boolean): string {
		const nonce = this.getNonce();
		const externalProcesses = Array.from(DotNetWatch.ProcessService.GetDotNetWatchProcesses());

		// Start/Stop Scan Button
		const scanButton = DotNetWatch.ProcessService.isScanningProcess()
			? `<button class="vscode-button vscode-secondary" onclick="handleCommand('${ProcessTableViewProvider.COMMANDS.STOP_PROCESS_SCANNER}')">
					Stop scanning processes
				 </button>`
			: `<button class="vscode-button" onclick="handleCommand('${ProcessTableViewProvider.COMMANDS.START_PROCESS_SCANNER}')">
					Start scanning processes
				 </button>`;

		const autoAttachButton = DotNetWatch.AttachService.isScanningProcess()
			? `<button class="vscode-button vscode-secondary" onclick="handleCommand('${ProcessTableViewProvider.COMMANDS.STOP_PROCESS_SCANNER}')">
					Stop auto attaching
				</button>`
			: `<button class="vscode-button" onclick="handleCommand('${ProcessTableViewProvider.COMMANDS.START_PROCESS_SCANNER}')">
					Start auto attaching
				</button>`;

		// Process List Items
		const processItems = showProcesses ? externalProcesses.map((p) => `
			<li class="process-item">
				<span class="process-name" title="${p.cml}">${p.cml}</span>
				<span class="process-pid">PID: ${p.pid}</span>
				<span class="process-actions">
				${DotNetWatch.Cache.hasDebugSession(p.pid) ?
				`<a id="debug-stop-${p.pid}" class="tooltip-container"
						onclick="handleCommand('${ProcessTableViewProvider.COMMANDS.DEBUG_STOP}', ${p.pid})">
						<span class="codicon codicon-debug-stop" style="color: ${ProcessTableViewProvider.ICONS.DEBUG_STOP.color};"></span>
						<span class="tooltip">${ProcessTableViewProvider.ICONS.DEBUG_STOP.tooltip}</span>
					</a>
					`: ''}
					${DotNetWatch.Cache.hasDebugSession(p.pid) ? `` :
				`<a id="attach-${p.pid}" class="tooltip-container"
						onclick="handleCommand('${ProcessTableViewProvider.COMMANDS.ATTACH}', ${p.pid})">
						<span class="codicon codicon-debug" style="color: ${ProcessTableViewProvider.ICONS.ATTACH.color};"></span>
						<span class="tooltip">${ProcessTableViewProvider.ICONS.ATTACH.tooltip}</span>
						</a>`}
				</span>
			</li>`).join("") : [];

		return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<style>
				@import url("https://microsoft.github.io/vscode-codicons/dist/codicon.css");

				body {
				font-family: var(--vscode-font-family);
				color: var(--vscode-editor-foreground);
				overflow: hidden;
				}

				.button-container {
						display: flex;
						flex-direction: column;
						gap: 8px; /* Space between buttons */
				}
				/* Primary Button */
				.vscode-button {
					background-color: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					border: 1px solid var(--vscode-button-border);
					padding: 6px 12px;
					cursor: pointer;
					border-radius: 3px;
					width: 100%;
					max-width: 300px;
					text-align: center;
				}
				.vscode-button:hover { background-color: var(--vscode-button-hoverBackground); }

				/* Secondary (Gray) Button */
				.vscode-secondary {
					background-color: var(--vscode-button-secondaryBackground);
					color: var(--vscode-button-secondaryForeground);
				}
				.vscode-secondary:hover { background-color: var(--vscode-button-secondaryHoverBackground); }

				.process-item {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 8px;
					border-bottom: 1px solid var(--vscode-editorWidget-border);
					list-style-type: none;
				}
				.process-name {
					flex: 2;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.process-pid {
					flex: 1;
					color: var(--vscode-descriptionForeground);
					font-size: 12px;
				}
				.process-actions a {
					margin-left: 10px;
					cursor: pointer;
					font-size: 16px;
					position: relative;
					display: inline-block;
				}

				/* VS Code-style Tooltips */
				.tooltip-container {
					position: relative;
					display: inline-block;
				}
				.tooltip {
					visibility: hidden;
					background-color: var(--vscode-editorWidget-background);
					color: var(--vscode-editorWidget-foreground);
					text-align: center;
					padding: 4px 8px;
					border-radius: 3px;
					font-size: 12px;
					position: absolute;
					z-index: 9999; /* Increased to stay above VS Code elements */
					z-index: 1000;
					bottom: 125%;
					left: -125%;
					transform: translateX(-50%);
					white-space: nowrap;
					box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.2);
				}
				.tooltip-container:hover .tooltip {
					visibility: visible;
				}

				ul {
					margin-block-start: unset;
					padding-inline-start: 0;

				}
			</style>
			<script nonce="${nonce}">
				const tsvscode = acquireVsCodeApi();
				function handleCommand(command, pid = null) {
					tsvscode.postMessage({ command, pid });
				}
			</script>
		</head>
		<body>
			<div class="process-item">Make your code changes and save! ctrl+r at terminal and we will re-attach!</div><br/>
			<div class="button-container">
				${scanButton}
				${autoAttachButton}
			</div>
			<ul>${processItems}</ul>
		</body>
		</html>`;
	}


	getNonce() {
		return [...Array(32)].map(() => Math.random().toString(36)[2]).join("");
	}

	refresh(showProcesses = true) {
		if (this._view) {
			this._view.webview.html = this.getHtml(showProcesses);
		}
	}
}
