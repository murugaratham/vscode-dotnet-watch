import ProjectQuickPickItem from '../../models/ProjectQuickPickItem';
import { Uri } from 'vscode';

describe('ProjectQuickPickItem', () => {
	it('should parse project name from csproj path', () => {
		const uri = Uri.file('/path/to/TestProject.csproj');
		const item = new ProjectQuickPickItem(uri);

		expect(item.label).toBe('TestProject');
		expect(item.detail).toBe(uri.fsPath);
		expect(item.uri).toBe(uri);
	});

	it('should handle paths with different separators', () => {
		const windowsUri = Uri.file('C:\\path\\to\\TestProject.csproj');
		const unixUri = Uri.file('/path/to/TestProject.csproj');

		const windowsItem = new ProjectQuickPickItem(windowsUri);
		const unixItem = new ProjectQuickPickItem(unixUri);

		expect(windowsItem.label).toBe('TestProject');
		expect(unixItem.label).toBe('TestProject');
	});
});
