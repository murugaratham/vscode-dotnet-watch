import ProcessDetail from '../../models/ProcessDetail';

describe('ProcessDetail', () => {
	describe('constructor', () => {
		it('should create instance with number parameters', () => {
			const process = new ProcessDetail(123, 456, 'test command');
			expect(process.pid).toBe(123);
			expect(process.ppid).toBe(456);
			expect(process.cml).toBe('test command');
		});

		it('should create instance with string parameters', () => {
			const process = new ProcessDetail('123', '456', 'test command');
			expect(process.pid).toBe(123);
			expect(process.ppid).toBe(456);
			expect(process.cml).toBe('test command');
		});
	});
});
