# MLX Integration Plan Using llm.js

[Previous sections remain the same...]

## Instance Locking

### Lock Manager
Create `src/services/mlx/lock-manager.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface LockInfo {
    pid: number;
    timestamp: number;
    instanceId: string;
}

export class MlxLockManager {
    private lockFile: string;
    private lockCheckInterval: number;
    private lockTimeout: number;
    private instanceId: string;
    private intervalHandle?: NodeJS.Timer;

    constructor() {
        this.lockFile = path.join(os.tmpdir(), 'roo-code-mlx.lock');
        this.lockCheckInterval = 1000; // 1 second
        this.lockTimeout = 5000; // 5 seconds
        this.instanceId = Math.random().toString(36).substring(7);
    }

    // Acquire lock
    async acquireLock(): Promise<boolean> {
        try {
            // Check for existing lock
            if (await this.isLocked()) {
                return false;
            }

            // Write lock file
            const lockInfo: LockInfo = {
                pid: process.pid,
                timestamp: Date.now(),
                instanceId: this.instanceId
            };
            
            fs.writeFileSync(this.lockFile, JSON.stringify(lockInfo));

            // Start lock maintenance
            this.startLockMaintenance();
            return true;
        } catch (error) {
            console.error('Failed to acquire lock:', error);
            return false;
        }
    }

    // Release lock
    async releaseLock(): Promise<void> {
        try {
            // Only release if we own the lock
            const lockInfo = await this.getLockInfo();
            if (lockInfo?.instanceId === this.instanceId) {
                fs.unlinkSync(this.lockFile);
            }

            // Stop maintenance
            if (this.intervalHandle) {
                clearInterval(this.intervalHandle);
            }
        } catch (error) {
            console.error('Failed to release lock:', error);
        }
    }

    // Check if locked
    private async isLocked(): Promise<boolean> {
        try {
            const lockInfo = await this.getLockInfo();
            if (!lockInfo) return false;

            // Check if lock is stale
            if (Date.now() - lockInfo.timestamp > this.lockTimeout) {
                // Clean up stale lock
                await this.cleanupStaleLock(lockInfo);
                return false;
            }

            // Check if process is still running
            try {
                process.kill(lockInfo.pid, 0);
                return true;
            } catch {
                // Process not running
                await this.cleanupStaleLock(lockInfo);
                return false;
            }
        } catch {
            return false;
        }
    }

    // Get lock info
    private async getLockInfo(): Promise<LockInfo | null> {
        try {
            const content = fs.readFileSync(this.lockFile, 'utf8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    // Clean up stale lock
    private async cleanupStaleLock(lockInfo: LockInfo): Promise<void> {
        try {
            const currentInfo = await this.getLockInfo();
            if (currentInfo?.timestamp === lockInfo.timestamp) {
                fs.unlinkSync(this.lockFile);
            }
        } catch (error) {
            console.error('Failed to cleanup stale lock:', error);
        }
    }

    // Maintain lock
    private startLockMaintenance(): void {
        this.intervalHandle = setInterval(async () => {
            try {
                const lockInfo = await this.getLockInfo();
                if (lockInfo?.instanceId === this.instanceId) {
                    // Update timestamp
                    lockInfo.timestamp = Date.now();
                    fs.writeFileSync(this.lockFile, JSON.stringify(lockInfo));
                }
            } catch (error) {
                console.error('Lock maintenance failed:', error);
            }
        }, this.lockCheckInterval);
    }
}
```

### MLX Provider Update
Update `src/api/providers/mlx.ts`:
```typescript
export class MlxHandler implements ApiHandler {
    private llm: LLM | null = null;
    private modelSelector: MlxModelSelector;
    private streamManager: MlxStreamManager;
    private lockManager: MlxLockManager;
    
    constructor(options: MlxHandlerOptions) {
        this.options = options;
        this.modelSelector = new MlxModelSelector();
        this.streamManager = new MlxStreamManager();
        this.lockManager = new MlxLockManager();
    }
    
    private async initializeLLM() {
        if (this.llm) return;
        
        // Try to acquire lock
        const locked = await this.lockManager.acquireLock();
        if (!locked) {
            throw new Error(
                "Another instance of Roo Code is currently using MLX. " +
                "Please wait for it to finish or close the other instance."
            );
        }

        try {
            const modelPath = this.options.mlxModelId || mlxDefaultModelId;
            this.llm = await loadLLM(modelPath);
        } catch (error) {
            // Release lock on failure
            await this.lockManager.releaseLock();
            throw error;
        }
    }

    // Cleanup resources
    async dispose(): Promise<void> {
        this.streamManager.cancelAll();
        this.llm = null;
        await this.lockManager.releaseLock();
    }
}
```

## Technical Considerations

### Lock Management
- File-based locking
- Process monitoring
- Stale lock cleanup
- Lock maintenance

### Error Handling
- Lock acquisition failures
- Stale lock detection
- Process termination

### User Experience
- Clear error messages
- Status updates
- Instance management

## Next Steps

1. Implement lock manager
2. Update provider
3. Test multi-instance
4. Add error handling

## Success Criteria

1. Single instance enforcement
2. Clean lock management
3. Proper error handling
4. Good user experience
5. Pass integration tests