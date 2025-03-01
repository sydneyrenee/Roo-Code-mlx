export class McpHub {
	connections = []
	isConnecting = false

	constructor() {
		this.toggleToolAlwaysAllow = this.createMockFunction()
		this.callTool = this.createMockFunction()
	}

	async toggleToolAlwaysAllow(serverName: string, toolName: string, shouldAllow: boolean): Promise<void> {
		return Promise.resolve()
	}

	async callTool(serverName: string, toolName: string, toolArguments?: Record<string, unknown>): Promise<any> {
		return Promise.resolve({ result: "success" })
	}

	private createMockFunction() {
		const fn = function(...args: any[]) {
			fn.mock.calls.push(args as any);
			return fn.mock.returnValue;
		};
		fn.mock = {
			calls: [] as any[][],
			returnValue: Promise.resolve(),
			mockReturnValue: function(value: any) {
				fn.mock.returnValue = value;
				return fn;
			},
			mockImplementation: function(implementation: (...args: any[]) => any) {
				const originalFn = fn;
				const newFn = function(...args: any[]) {
					newFn.mock.calls.push(args as any);
					return implementation(...args);
				};
				newFn.mock = originalFn.mock;
				return newFn;
			},
			mockClear: function() {
				fn.mock.calls = [];
				return fn;
			}
		};
		return fn;
	}
}
