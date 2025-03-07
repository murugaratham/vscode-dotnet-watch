import ProcessService from '../../services/process-service';

describe('ProcessService', () => {
	let processService: ProcessService;

	beforeEach(() => {
		processService = new ProcessService();
	});

	describe('GetDotNetWatchProcesses', () => {
		it('should return only dotnet watch processes', () => {
			const processes = processService.GetDotNetWatchProcesses();
			processes.forEach(process => {
				expect(process.cml).toContain('watch');
			});
		});
	});
});
