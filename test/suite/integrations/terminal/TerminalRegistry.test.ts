import * as vscode from 'vscode';
import * as assert from 'assert';
import { TerminalRegistry } from '../../../../integrations/terminal/TerminalRegistry';

suite('TerminalRegistry Tests', () => {
    const testController = vscode.test.createTestController('terminalTests', 'Terminal Integration Tests');
    const rootSuite = testController.createTestItem('root', 'Terminal Registry Tests');
    
    let mockCreateTerminal: jest.Mock;
    
    setup(() => {
        mockCreateTerminal = jest.fn();
        (vscode.window.createTerminal as jest.Mock) = mockCreateTerminal;
        mockCreateTerminal.mockReturnValue({ exitStatus: undefined });
    });

    const terminalSuite = testController.createTestItem('terminal', 'Terminal Creation');
    rootSuite.children.add(terminalSuite);

    terminalSuite.children.add(
        testController.createTestItem('createTerminal', 'creates terminal with PAGER set to cat', async run => {
            TerminalRegistry.createTerminal('/test/path');
            
            assert.ok(mockCreateTerminal.called);
            assert.deepStrictEqual(mockCreateTerminal.mock.calls[0][0], {
                cwd: '/test/path',
                name: 'Roo Code',
                iconPath: expect.any(Object),
                env: {
                    PAGER: 'cat'
                }
            });
            
            run.passed();
        })
    );

    // Add tests to controller
    testController.items.add(rootSuite);
});