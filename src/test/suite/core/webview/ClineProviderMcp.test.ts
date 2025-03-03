import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { McpManager } from '../../../../core/webview/ClineProviderMcp';
import { createMockExtensionContext, createMockOutputChannel } from '../../utils/mock-helpers';
import { GlobalFileNames } from '../../../../core/webview/ClineProviderTypes';

// Import fs module for mocking
import * as fs from 'fs/promises';

suite('ClineProviderMcp', () => {
    let mcpManager: McpManager;
    let outputChannel: vscode.OutputChannel;
    let context: vscode.ExtensionContext;
    
    // Store original fs functions
    const originalFsMkdir = fs.mkdir;
    const originalFsReadFile = fs.readFile;
    const originalFsWriteFile = fs.writeFile;
    
    // Track mock fs operations
    let mkdirPaths: string[] = [];
    let readFilePaths: string[] = [];
    let writeFilePaths: string[] = [];
    let writeFileContents: string[] = [];
    let mockReadFileContent: string = '{}';
    let mockMkdirShouldThrow: boolean = false;
    
    setup(() => {
        // Reset tracking arrays
        mkdirPaths = [];
        readFilePaths = [];
        writeFilePaths = [];
        writeFileContents = [];
        mockReadFileContent = '{}';
        mockMkdirShouldThrow = false;
        
        // Create mocks
        outputChannel = createMockOutputChannel();
        context = createMockExtensionContext();
        
        // Create manager instance
        mcpManager = new McpManager(context, outputChannel);
    });
    
    teardown(() => {
        // Restore original fs functions
        (fs.mkdir as any) = originalFsMkdir;
        (fs.readFile as any) = originalFsReadFile;
        (fs.writeFile as any) = originalFsWriteFile;
    });
    
    suite('Directory Management', () => {
        test('should ensure MCP servers directory exists', async () => {
            // Mock fs.mkdir
            (fs.mkdir as any) = async (dirPath: string) => {
                mkdirPaths.push(dirPath);
                return undefined;
            };
            
            const result = await mcpManager.ensureMcpServersDirectoryExists();
            const expectedPath = path.join(os.homedir(), 'Documents', 'Cline', 'MCP');
            
            assert.strictEqual(mkdirPaths.length, 1, 'mkdir should be called once');
            assert.strictEqual(mkdirPaths[0], expectedPath, 'Should create correct directory path');
            assert.strictEqual(result, expectedPath, 'Result should be the MCP path');
        });
        
        test('should handle errors when creating MCP servers directory', async () => {
            // Mock fs.mkdir to throw an error
            (fs.mkdir as any) = async () => {
                throw new Error('Permission denied');
            };
            
            const result = await mcpManager.ensureMcpServersDirectoryExists();
            
            assert.strictEqual(result, '~/Documents/Cline/MCP', 'Should return fallback path on error');
        });
        
        test('should ensure settings directory exists', async () => {
            // Mock fs.mkdir
            (fs.mkdir as any) = async (dirPath: string) => {
                mkdirPaths.push(dirPath);
                return undefined;
            };
            
            const result = await mcpManager.ensureSettingsDirectoryExists();
            const expectedPath = path.join(context.globalStorageUri.fsPath, 'settings');
            
            assert.strictEqual(mkdirPaths.length, 1, 'mkdir should be called once');
            assert.strictEqual(mkdirPaths[0], expectedPath, 'Should create settings directory in global storage');
            assert.strictEqual(result, expectedPath, 'Result should be the settings path');
        });
        
        test('should get MCP settings file path', async () => {
            // Mock fs.mkdir
            (fs.mkdir as any) = async (dirPath: string) => {
                mkdirPaths.push(dirPath);
                return undefined;
            };
            
            const result = await mcpManager.getMcpSettingsFilePath();
            const expectedDir = path.join(context.globalStorageUri.fsPath, 'settings');
            const expectedPath = path.join(expectedDir, GlobalFileNames.mcpSettings);
            
            assert.strictEqual(mkdirPaths.length, 1, 'Settings directory should be created');
            assert.strictEqual(result, expectedPath, 'Should return correct settings file path');
        });
    });
    
    suite('Server Settings Management', () => {
        test('should toggle server disabled state', async () => {
            // Mock fs.mkdir
            (fs.mkdir as any) = async (dirPath: string) => {
                mkdirPaths.push(dirPath);
                return undefined;
            };
            
            // Mock fs.readFile
            (fs.readFile as any) = async (filePath: string) => {
                readFilePaths.push(filePath);
                return '{}';
            };
            
            // Mock fs.writeFile
            (fs.writeFile as any) = async (filePath: string, content: string) => {
                writeFilePaths.push(filePath);
                writeFileContents.push(content);
                return undefined;
            };
            
            await mcpManager.toggleServerDisabled('test-server', true);
            
            assert.strictEqual(readFilePaths.length, 1, 'readFile should be called once');
            assert.strictEqual(writeFilePaths.length, 1, 'writeFile should be called once');
            
            const settings = JSON.parse(writeFileContents[0]);
            assert.strictEqual(settings.servers['test-server'].disabled, true, 
                'Server should be marked as disabled');
        });
        
        test('should toggle server disabled state with existing settings', async () => {
            // Mock fs.mkdir
            (fs.mkdir as any) = async (dirPath: string) => {
                mkdirPaths.push(dirPath);
                return undefined;
            };
            
            // Mock fs.readFile
            (fs.readFile as any) = async (filePath: string) => {
                readFilePaths.push(filePath);
                return JSON.stringify({
                    servers: {
                        'test-server': {
                            disabled: false
                        }
                    }
                });
            };
            
            // Mock fs.writeFile
            (fs.writeFile as any) = async (filePath: string, content: string) => {
                writeFilePaths.push(filePath);
                writeFileContents.push(content);
                return undefined;
            };
            
            await mcpManager.toggleServerDisabled('test-server', true);
            
            const settings = JSON.parse(writeFileContents[0]);
            assert.strictEqual(settings.servers['test-server'].disabled, true, 
                'Server disabled state should be updated');
        });
        
        test('should handle errors when toggling server disabled state', async () => {
            // Mock fs.mkdir
            (fs.mkdir as any) = async (dirPath: string) => {
                mkdirPaths.push(dirPath);
                return undefined;
            };
            
            // Mock fs.readFile to throw an error
            (fs.readFile as any) = async () => {
                throw new Error('File not found');
            };
            
            // Mock fs.writeFile
            (fs.writeFile as any) = async (filePath: string, content: string) => {
                writeFilePaths.push(filePath);
                writeFileContents.push(content);
                return undefined;
            };
            
            try {
                await mcpManager.toggleServerDisabled('test-server', true);
                
                // If we get here, the function handled the error correctly
                assert.ok(true, 'Should handle file not found error');
                
                const settings = JSON.parse(writeFileContents[0]);
                assert.strictEqual(settings.servers['test-server'].disabled, true, 
                    'Server should be marked as disabled even when file not found');
            } catch (error) {
                assert.fail('Should not throw an error');
            }
        });
        
        test('should toggle tool always allow setting', async () => {
            // Mock fs.mkdir
            (fs.mkdir as any) = async (dirPath: string) => {
                mkdirPaths.push(dirPath);
                return undefined;
            };
            
            // Mock fs.readFile
            (fs.readFile as any) = async (filePath: string) => {
                readFilePaths.push(filePath);
                return '{}';
            };
            
            // Mock fs.writeFile
            (fs.writeFile as any) = async (filePath: string, content: string) => {
                writeFilePaths.push(filePath);
                writeFileContents.push(content);
                return undefined;
            };
            
            await mcpManager.toggleToolAlwaysAllow('test-server', 'test-tool', true);
            
            const settings = JSON.parse(writeFileContents[0]);
            assert.strictEqual(settings.servers['test-server'].tools['test-tool'].alwaysAllow, true, 
                'Tool should be marked as always allow');
        });
        
        test('should update server timeout', async () => {
            // Mock fs.mkdir
            (fs.mkdir as any) = async (dirPath: string) => {
                mkdirPaths.push(dirPath);
                return undefined;
            };
            
            // Mock fs.readFile
            (fs.readFile as any) = async (filePath: string) => {
                readFilePaths.push(filePath);
                return '{}';
            };
            
            // Mock fs.writeFile
            (fs.writeFile as any) = async (filePath: string, content: string) => {
                writeFilePaths.push(filePath);
                writeFileContents.push(content);
                return undefined;
            };
            
            const timeout = 30000;
            await mcpManager.updateServerTimeout('test-server', timeout);
            
            const settings = JSON.parse(writeFileContents[0]);
            assert.strictEqual(settings.servers['test-server'].timeout, timeout, 
                'Server timeout should be updated');
        });
    });
});