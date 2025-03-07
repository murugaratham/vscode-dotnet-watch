import { createVSCodeMock } from 'jest-mock-vscode';

const vscode = createVSCodeMock(jest);
vscode.debug = {
	...vscode.debug,
	onDidStartDebugSession: jest.fn(),
	registerDebugAdapterTrackerFactory: jest.fn(),
}

module.exports = vscode;
