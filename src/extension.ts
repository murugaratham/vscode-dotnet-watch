/*
 * @file Contains the vscode extension.
 * @Author: Dennis Jung
 * @Author: Konrad Müller
 * @Date: 2018-06-13 20:32:01
 * @Last Modified by: Dennis Jung
 * @Last Modified time: 2018-09-03 11:45:37
 */

"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import DotNetAutoAttach from "./dotNetAutoAttach";

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 *
 * @export
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {
	DotNetAutoAttach.Start();
}

/**
 * This method is called when your extension is deactivated.
 *
 * @export
 */
export function deactivate() {
	DotNetAutoAttach.Stop();
}
