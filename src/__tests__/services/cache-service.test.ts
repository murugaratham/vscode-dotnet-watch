import CacheService from '../../services/cache-service';
import ProcessDetail from '../../models/ProcessDetail';
import { DebugSession } from 'vscode';

describe('CacheService', () => {
	let cacheService: CacheService;

	beforeEach(() => {
		cacheService = new CacheService();
	});

	afterEach(() => {
		cacheService.dispose();
	});

	describe('Debug Sessions', () => {
		it('should manage debug sessions correctly', () => {
			const mockSession = { name: 'Test Session' } as DebugSession;
			const pid = 123;

			cacheService.addRunningDebugSession(pid, mockSession);
			expect(cacheService.hasDebugSession(pid)).toBe(true);
			expect(cacheService.getDebugSession(pid)).toBe(mockSession);

			cacheService.removeDebugSession(pid);
			expect(cacheService.hasDebugSession(pid)).toBe(false);
			expect(cacheService.getDebugSession(pid)).toBeUndefined();
		});
	});

	describe('External Processes', () => {
		it('should manage external processes correctly', () => {
			const mockProcess = new ProcessDetail(123, 456, 'test command');
			const pid = mockProcess.pid;

			cacheService.ExternalDotnetWatchProcesses.set(pid, mockProcess);
			expect(cacheService.getExternalProcess(pid)).toBe(mockProcess);
		});
	});
});
