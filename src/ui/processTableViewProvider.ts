import * as vscode from "vscode";
import DotNetWatch from "../dotNetWatch";
import ProcessDetail from "../models/ProcessDetail";

export class ProcessTableViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "watched-processes";
	private _view?: vscode.WebviewView;
	private processes: ProcessDetail[] = [];
	private _nonce: string;

	private static readonly COMMANDS = {
		ATTACH: "attach",
		START_PROCESS_SCANNER: "start-process-scanner",
		STOP_PROCESS_SCANNER: "stop-process-scanner",
		START_AUTO_ATTACH: "start-auto-attach",
		STOP_AUTO_ATTACH: "stop-auto-attach",
		DEBUG_STOP: "debug-stop"
	};

	private static readonly styles = {
		DEBUG_STOP: { class: "codicon codicon-debug-stop", tooltip: "Stop Debugger", color: "#f48771" },
		ATTACH: { class: "codicon codicon-debug", tooltip: "Attach Debugger", color: "#89d185" },
	};

	constructor() {
		this._nonce = this.getNonce(); // Generate nonce once per instance
		DotNetWatch.ProcessService.onProcessesUpdated((updatedProcesses) => {
			this.processes = updatedProcesses;
			this.refresh();
		});
		DotNetWatch.DebugService.onDebugParametersChanged(() => {
			this.refresh();
		});;
		DotNetWatch.ProcessService.onScanningStateChanged(() => this.refresh());
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
					DotNetWatch.ProcessService.StartProcessScanner();
					// don't need to refresh, since process scanner will check for delta and push to UI
					break;
				case ProcessTableViewProvider.COMMANDS.STOP_PROCESS_SCANNER:
					DotNetWatch.ProcessService.StopProcessScanner();
					this.refresh(false);
					break;
				case ProcessTableViewProvider.COMMANDS.DEBUG_STOP: {
					const debugProcess = this.processes.find(p => p.pid === message.pid);
					if (debugProcess) DotNetWatch.DebugService.disconnectAndTerminateTask(message.pid)
					break;
				}
				case ProcessTableViewProvider.COMMANDS.START_AUTO_ATTACH:
					DotNetWatch.AttachService.StartAutoAttachScanner();
					this.refresh(true);
					break;
				case ProcessTableViewProvider.COMMANDS.STOP_AUTO_ATTACH:
					DotNetWatch.AttachService.StopAutoAttachScanner();
					this.refresh(true);
					break;
			}
		});
	}

	tryAttach(p: ProcessDetail) {
		DotNetWatch.Cache.ExternalDotnetWatchProcesses.set(p.pid, p);
		DotNetWatch.AttachService.AttachToProcess(p);
	}

	private getHtml(showProcesses: boolean): string {
		const nonce = this._nonce;
		const externalProcesses = Array.from(DotNetWatch.ProcessService.GetDotNetWatchProcesses());

		// Start/Stop Scan Button
		const scanButton = DotNetWatch.ProcessService.IsScanningProcesses()
			? `<button id="stop-scan-process-btn" class="vscode-button vscode-secondary">Stop scanning processes</button>`
			: `<button id="start-scan-process-btn" class="vscode-button">Start scanning processes</button>`;


		const autoAttachButton = DotNetWatch.AttachService.IsScanningToAttach()
			? `<button id="stop-scan-attach-btn" class="vscode-button vscode-secondary">Stop auto attaching</button>`
			: `<button id="start-scan-attach-btn" class="vscode-button">Start auto attaching</button>`;

		// Process List Items
		const processItems = showProcesses ? externalProcesses.map((p) => {
			const hasDebugSession = DotNetWatch.Cache.hasDebugSession(p.pid);
			return `
			<li class="process-item">
				<span class="process-name" title="${p.cml}">${p.cml}</span>
				<span class="process-pid">PID: ${p.pid}</span>
				<span class="process-actions">
				${hasDebugSession ?
					`<a id="${ProcessTableViewProvider.COMMANDS.DEBUG_STOP}-${p.pid}" class="tooltip-container" data-pid="${p.pid}" data-command="${ProcessTableViewProvider.COMMANDS.DEBUG_STOP}">
							<span class="${ProcessTableViewProvider.styles.DEBUG_STOP.class}" style="color: ${ProcessTableViewProvider.styles.DEBUG_STOP.color};"></span>
							<span class="tooltip">${ProcessTableViewProvider.styles.DEBUG_STOP.tooltip}</span>
						</a>`
					:
					`<a id="${ProcessTableViewProvider.COMMANDS.ATTACH}-${p.pid}" class="tooltip-container" data-pid="${p.pid}" data-command="${ProcessTableViewProvider.COMMANDS.ATTACH}">
							<span class="${ProcessTableViewProvider.styles.ATTACH.class}" style="color: ${ProcessTableViewProvider.styles.ATTACH.color};"></span>
							<span class="tooltip">${ProcessTableViewProvider.styles.ATTACH.tooltip}</span>
						</a>`
				}
				</span>
			</li>`
		}).join("") : [];

		return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline' https://microsoft.github.io; font-src https://microsoft.github.io;script-src 'nonce-${nonce}';">
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
				document.addEventListener("DOMContentLoaded", () => {
					// Process scanning buttons
					document.getElementById("start-scan-process-btn")?.addEventListener("click", () => handleCommand("start-process-scanner"));
					document.getElementById("stop-scan-process-btn")?.addEventListener("click", () => handleCommand("stop-process-scanner"));

					// Auto attach buttons
					document.getElementById("start-scan-attach-btn")?.addEventListener("click", () => handleCommand("start-auto-attach"));
					document.getElementById("stop-scan-attach-btn")?.addEventListener("click", () => handleCommand("stop-auto-attach"));

					// Attach event listeners dynamically for process action buttons
					document.querySelectorAll(".tooltip-container").forEach(element => {
						element.addEventListener("click", (event) => {
							// Find the <span> with codicon class inside the clicked element
							const icon = event.currentTarget.querySelector(".codicon");
							icon.className = "codicon codicon-loading codicon-modifier-spin";

							const command = event.currentTarget.getAttribute("data-command");
							const pid = event.currentTarget.getAttribute("data-pid");
							if (command) {
									handleCommand(command, pid ? parseInt(pid) : null);
							}
						});
					});
				});
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
